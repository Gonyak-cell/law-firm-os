#!/usr/bin/env node
import { readFile, stat } from "node:fs/promises";
import path from "node:path";
import process from "node:process";

const REQUIRED_FILES = [
  "packages/authz/src/trust-context.js",
  "packages/authz/src/index.js",
  "packages/authz/test/authz.test.js",
  "docs/reorganization/client-matter-os/18-g1-trust-foundation-plan.md",
  "docs/reorganization/client-matter-os/19-g1-a-tenant-actor-context-report.md"
];

const REQUIRED_TUWS = ["LFOS-G1-W01-T001", "LFOS-G1-W01-T002", "LFOS-G1-W01-T003"];

const REQUIRED_SOURCE_PHRASES = [
  "validateTenantBoundary",
  "createActorContext",
  "createPermissionContext",
  "tenant_context_missing",
  "resource_tenant_missing",
  "tenant_context_mismatch",
  "cross_tenant_deny",
  "actor_context_missing",
  "unauthorized_actor_type",
  "persistence_required",
  "header_only_trust_allowed"
];

const REQUIRED_TEST_PHRASES = [
  "G1-A tenant boundary rejects missing tenant",
  "G1-A actor context rejects missing actor",
  "G1-A actor context rejects unauthorized actor type",
  "G1-A permission context binds tenant actor action object and audit"
];

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

const findings = [];

for (const file of REQUIRED_FILES) {
  if (!(await exists(file))) {
    addFinding(findings, "MISSING_FILE", `Missing G1-A artifact: ${file}`);
  }
}

if (findings.length === 0) {
  const source = await readText("packages/authz/src/trust-context.js");
  const index = await readText("packages/authz/src/index.js");
  const tests = await readText("packages/authz/test/authz.test.js");
  const report = await readText("docs/reorganization/client-matter-os/19-g1-a-tenant-actor-context-report.md");
  const pkg = JSON.parse(await readText("package.json"));

  if (!index.includes('export * from "./trust-context.js";')) {
    addFinding(findings, "MISSING_EXPORT", "authz index must export trust-context.js.");
  }

  for (const phrase of REQUIRED_SOURCE_PHRASES) {
    if (!source.includes(phrase)) {
      addFinding(findings, "MISSING_SOURCE_PHRASE", "trust-context source missing required behavior marker.", {
        phrase
      });
    }
  }

  for (const phrase of REQUIRED_TEST_PHRASES) {
    if (!tests.includes(phrase)) {
      addFinding(findings, "MISSING_TEST", "authz tests missing required G1-A case.", { phrase });
    }
  }

  for (const tuw of REQUIRED_TUWS) {
    if (!source.includes(tuw) || !report.includes(tuw)) {
      addFinding(findings, "MISSING_TUW_TRACE", "G1-A source and report must both trace every TUW.", { tuw });
    }
  }

  if (!report.includes("G1 remains open") || !report.includes("does not claim runtime readiness")) {
    addFinding(findings, "G1_OPEN_BOUNDARY", "G1-A report must keep G1 runtime readiness open.");
  }

  if (!pkg.scripts?.["client-matter:g1a:validate"]) {
    addFinding(findings, "MISSING_NPM_SCRIPT", "package.json missing client-matter:g1a:validate.");
  }
}

if (findings.length > 0) {
  console.error("Client-Matter OS G1-A validation failed:");
  for (const finding of findings) {
    console.error(`- ${finding.code}: ${finding.message}`);
    if (Object.keys(finding.details).length > 0) {
      console.error(`  ${JSON.stringify(finding.details)}`);
    }
  }
  process.exit(1);
}

console.log("Client-Matter OS G1-A validation passed.");
console.log("g1a_tuws: LFOS-G1-W01-T001/LFOS-G1-W01-T002/LFOS-G1-W01-T003");
console.log("tenant_boundary: fail_closed");
console.log("actor_context: fail_closed");
console.log("permission_context: audit_bound_no_header_only_trust");
console.log("g1_runtime_readiness_claim: open");
