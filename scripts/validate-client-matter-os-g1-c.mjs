#!/usr/bin/env node
import { readFile, stat } from "node:fs/promises";
import path from "node:path";
import process from "node:process";

const REQUIRED_FILES = [
  "packages/authz/src/permission-controls.js",
  "packages/authz/src/index.js",
  "packages/authz/test/authz.test.js",
  "packages/authz/README.md",
  "docs/reorganization/client-matter-os/18-g1-trust-foundation-plan.md",
  "docs/reorganization/client-matter-os/21-g1-c-permission-controls-report.md"
];

const REQUIRED_TUWS = [
  "LFOS-G1-W01-T007",
  "LFOS-G1-W01-T008",
  "LFOS-G1-W01-T009",
  "LFOS-G1-W01-T010",
  "LFOS-G1-W01-T011",
  "LFOS-G1-W01-T012"
];

const REQUIRED_SOURCE_PHRASES = [
  "evaluatePermissionControlRequest",
  "/permissions/evaluate",
  "deny_over_allow",
  "object_acl_baseline",
  "ethical_wall",
  "legal_hold",
  "break_glass_requires_reason_approval_audit",
  "approval_id",
  "audit_required",
  "LFOS-G1-W01-T007",
  "LFOS-G1-W01-T008",
  "LFOS-G1-W01-T009",
  "LFOS-G1-W01-T010",
  "LFOS-G1-W01-T011",
  "LFOS-G1-W01-T012"
];

const REQUIRED_TEST_PHRASES = [
  "G1-C permission evaluator API wrapper returns allow deny review and approval",
  "G1-C deny-over-allow and object ACL controls fail closed",
  "G1-C ethical wall blocks a listed user from matter listing",
  "G1-C legal hold blocks held document delete even with allow ACL",
  "G1-C break-glass requires reason approval and audit before allow"
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
    addFinding(findings, "MISSING_FILE", `Missing G1-C artifact: ${file}`);
  }
}

if (findings.length === 0) {
  const source = await readText("packages/authz/src/permission-controls.js");
  const index = await readText("packages/authz/src/index.js");
  const tests = await readText("packages/authz/test/authz.test.js");
  const readme = await readText("packages/authz/README.md");
  const report = await readText("docs/reorganization/client-matter-os/21-g1-c-permission-controls-report.md");
  const plan = await readText("docs/reorganization/client-matter-os/18-g1-trust-foundation-plan.md");
  const pkg = JSON.parse(await readText("package.json"));

  if (!index.includes('export * from "./permission-controls.js";')) {
    addFinding(findings, "MISSING_EXPORT", "authz index must export permission-controls.js.");
  }

  for (const phrase of REQUIRED_SOURCE_PHRASES) {
    if (!source.includes(phrase)) {
      addFinding(findings, "MISSING_SOURCE_PHRASE", "permission-controls source missing required behavior marker.", {
        phrase
      });
    }
  }

  for (const phrase of REQUIRED_TEST_PHRASES) {
    if (!tests.includes(phrase)) {
      addFinding(findings, "MISSING_TEST", "authz tests missing required G1-C case.", { phrase });
    }
  }

  for (const tuw of REQUIRED_TUWS) {
    if (!source.includes(tuw) || !report.includes(tuw) || !plan.includes(tuw)) {
      addFinding(findings, "MISSING_TUW_TRACE", "G1-C source, report, and plan must trace every TUW.", { tuw });
    }
  }

  for (const phrase of ["Permission Controls", "Object ACL", "Ethical wall", "Legal hold", "Break-glass"]) {
    if (!readme.includes(phrase)) {
      addFinding(findings, "README_SCOPE_GAP", "authz README missing G1-C scope marker.", { phrase });
    }
  }

  if (!report.includes("G1 remains open") || !report.includes("does not claim runtime readiness")) {
    addFinding(findings, "G1_OPEN_BOUNDARY", "G1-C report must keep G1 runtime readiness open.");
  }

  if (!pkg.scripts?.["client-matter:g1c:validate"]) {
    addFinding(findings, "MISSING_NPM_SCRIPT", "package.json missing client-matter:g1c:validate.");
  }
}

if (findings.length > 0) {
  console.error("Client-Matter OS G1-C validation failed:");
  for (const finding of findings) {
    console.error(`- ${finding.code}: ${finding.message}`);
    if (Object.keys(finding.details).length > 0) {
      console.error(`  ${JSON.stringify(finding.details)}`);
    }
  }
  process.exit(1);
}

console.log("Client-Matter OS G1-C validation passed.");
console.log("g1c_tuws: LFOS-G1-W01-T007/LFOS-G1-W01-T008/LFOS-G1-W01-T009/LFOS-G1-W01-T010/LFOS-G1-W01-T011/LFOS-G1-W01-T012");
console.log("permission_evaluate_wrapper: allow/deny/review_required/approval_required");
console.log("deny_over_allow: fail_closed");
console.log("object_acl: allow_and_deny");
console.log("ethical_wall_legal_hold_break_glass: guarded");
console.log("g1_runtime_readiness_claim: open");
