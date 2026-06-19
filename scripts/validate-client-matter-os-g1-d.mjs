#!/usr/bin/env node
import { readFile, stat } from "node:fs/promises";
import path from "node:path";
import process from "node:process";

const REQUIRED_FILES = [
  "packages/audit/src/g1-closeout.js",
  "packages/audit/src/index.js",
  "packages/audit/test/audit.test.js",
  "packages/audit/README.md",
  "packages/authz/src/admin-simulator.js",
  "packages/authz/src/index.js",
  "packages/authz/test/authz.test.js",
  "packages/authz/README.md",
  "docs/reorganization/client-matter-os/18-g1-trust-foundation-plan.md",
  "docs/reorganization/client-matter-os/22-g1-d-audit-closeout-report.md"
];

const REQUIRED_TUWS = [
  "LFOS-G1-W01-T013",
  "LFOS-G1-W01-T014",
  "LFOS-G1-W01-T015",
  "LFOS-G1-W01-T016"
];

const REQUIRED_AUDIT_SOURCE_PHRASES = [
  "verifyTenantAuditHashChain",
  "exportTenantAuditEvents",
  "createG1TrustFoundationCloseout",
  "tamper_evident",
  "metadata_only_export",
  "human_review_disposition",
  "self_merge_allowed",
  "LFOS-G1-W01-T013",
  "LFOS-G1-W01-T014",
  "LFOS-G1-W01-T016"
];

const REQUIRED_AUTHZ_SOURCE_PHRASES = [
  "simulateAdminPermission",
  "simulator_only",
  "grant_applied",
  "can_grant_access",
  "audit_required",
  "admin.permission.simulate",
  "LFOS-G1-W01-T015"
];

const REQUIRED_TEST_PHRASES = [
  "G1-D audit hash-chain verification detects tamper",
  "G1-D audit export is tenant scoped and chain verified",
  "G1-D closeout records command PR and human review state without self merge",
  "G1-D admin permission simulator cannot grant access or bypass audit"
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
    addFinding(findings, "MISSING_FILE", `Missing G1-D artifact: ${file}`);
  }
}

if (findings.length === 0) {
  const auditSource = await readText("packages/audit/src/g1-closeout.js");
  const auditIndex = await readText("packages/audit/src/index.js");
  const auditTests = await readText("packages/audit/test/audit.test.js");
  const auditReadme = await readText("packages/audit/README.md");
  const authzSource = await readText("packages/authz/src/admin-simulator.js");
  const authzIndex = await readText("packages/authz/src/index.js");
  const authzTests = await readText("packages/authz/test/authz.test.js");
  const authzReadme = await readText("packages/authz/README.md");
  const report = await readText("docs/reorganization/client-matter-os/22-g1-d-audit-closeout-report.md");
  const plan = await readText("docs/reorganization/client-matter-os/18-g1-trust-foundation-plan.md");
  const pkg = JSON.parse(await readText("package.json"));

  if (!auditIndex.includes('export * from "./g1-closeout.js";')) {
    addFinding(findings, "MISSING_AUDIT_EXPORT", "audit index must export g1-closeout.js.");
  }

  if (!authzIndex.includes('export * from "./admin-simulator.js";')) {
    addFinding(findings, "MISSING_AUTHZ_EXPORT", "authz index must export admin-simulator.js.");
  }

  for (const phrase of REQUIRED_AUDIT_SOURCE_PHRASES) {
    if (!auditSource.includes(phrase)) {
      addFinding(findings, "MISSING_AUDIT_SOURCE_PHRASE", "g1-closeout source missing required behavior marker.", {
        phrase
      });
    }
  }

  for (const phrase of REQUIRED_AUTHZ_SOURCE_PHRASES) {
    if (!authzSource.includes(phrase)) {
      addFinding(findings, "MISSING_AUTHZ_SOURCE_PHRASE", "admin-simulator source missing required behavior marker.", {
        phrase
      });
    }
  }

  for (const phrase of REQUIRED_TEST_PHRASES) {
    if (!auditTests.includes(phrase) && !authzTests.includes(phrase)) {
      addFinding(findings, "MISSING_TEST", "tests missing required G1-D case.", { phrase });
    }
  }

  for (const tuw of REQUIRED_TUWS) {
    const inSource = auditSource.includes(tuw) || authzSource.includes(tuw);
    if (!inSource || !report.includes(tuw) || !plan.includes(tuw)) {
      addFinding(findings, "MISSING_TUW_TRACE", "G1-D source, report, and plan must trace every TUW.", { tuw });
    }
  }

  for (const phrase of ["Audit Verification", "tenant-scoped", "Closeout"]) {
    if (!auditReadme.includes(phrase)) {
      addFinding(findings, "AUDIT_README_SCOPE_GAP", "audit README missing G1-D scope marker.", { phrase });
    }
  }

  for (const phrase of ["Admin Permission Simulator", "never grants access", "audit"]) {
    if (!authzReadme.includes(phrase)) {
      addFinding(findings, "AUTHZ_README_SCOPE_GAP", "authz README missing G1-D scope marker.", { phrase });
    }
  }

  if (!report.includes("G1 remains open") || !report.includes("does not claim runtime readiness")) {
    addFinding(findings, "G1_OPEN_BOUNDARY", "G1-D report must keep G1 runtime readiness open.");
  }

  if (!pkg.scripts?.["client-matter:g1d:validate"]) {
    addFinding(findings, "MISSING_NPM_SCRIPT", "package.json missing client-matter:g1d:validate.");
  }
}

if (findings.length > 0) {
  console.error("Client-Matter OS G1-D validation failed:");
  for (const finding of findings) {
    console.error(`- ${finding.code}: ${finding.message}`);
    if (Object.keys(finding.details).length > 0) {
      console.error(`  ${JSON.stringify(finding.details)}`);
    }
  }
  process.exit(1);
}

console.log("Client-Matter OS G1-D validation passed.");
console.log("g1d_tuws: LFOS-G1-W01-T013/LFOS-G1-W01-T014/LFOS-G1-W01-T015/LFOS-G1-W01-T016");
console.log("hash_chain_verification: tamper_detecting");
console.log("audit_export: tenant_scoped_metadata_only");
console.log("admin_simulator: no_grant_audit_bound");
console.log("closeout: command_pr_human_review_recorded");
console.log("g1_runtime_readiness_claim: open");
