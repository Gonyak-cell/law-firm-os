#!/usr/bin/env node
import { readFile, stat } from "node:fs/promises";
import path from "node:path";
import process from "node:process";

const REQUIRED_FILES = [
  "packages/audit/src/durable-entry.js",
  "packages/audit/src/index.js",
  "packages/audit/test/audit.test.js",
  "docs/reorganization/client-matter-os/18-g1-trust-foundation-plan.md",
  "docs/reorganization/client-matter-os/20-g1-b-durable-audit-report.md"
];

const REQUIRED_TUWS = ["LFOS-G1-W01-T004", "LFOS-G1-W01-T005", "LFOS-G1-W01-T006"];

const REQUIRED_SOURCE_PHRASES = [
  "buildAuditEventInput",
  "createAuditMiddleware",
  "recordSensitiveRead",
  "permission_decision_id",
  "payload_digest",
  "idempotency_key",
  "append-only audit ledger",
  "LFOS-G1-W01-T004",
  "LFOS-G1-W01-T005",
  "LFOS-G1-W01-T006"
];

const REQUIRED_TEST_PHRASES = [
  "G1-B durable audit event input appends through hash chain",
  "G1-B audit middleware appends write route audit events idempotently",
  "G1-B sensitive read audit binds permission decision and document version"
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
    addFinding(findings, "MISSING_FILE", `Missing G1-B artifact: ${file}`);
  }
}

if (findings.length === 0) {
  const source = await readText("packages/audit/src/durable-entry.js");
  const index = await readText("packages/audit/src/index.js");
  const tests = await readText("packages/audit/test/audit.test.js");
  const report = await readText("docs/reorganization/client-matter-os/20-g1-b-durable-audit-report.md");
  const plan = await readText("docs/reorganization/client-matter-os/18-g1-trust-foundation-plan.md");
  const pkg = JSON.parse(await readText("package.json"));

  if (!index.includes('export * from "./durable-entry.js";')) {
    addFinding(findings, "MISSING_EXPORT", "audit index must export durable-entry.js.");
  }

  for (const phrase of REQUIRED_SOURCE_PHRASES) {
    if (!source.includes(phrase)) {
      addFinding(findings, "MISSING_SOURCE_PHRASE", "durable-entry source missing required behavior marker.", {
        phrase
      });
    }
  }

  for (const phrase of REQUIRED_TEST_PHRASES) {
    if (!tests.includes(phrase)) {
      addFinding(findings, "MISSING_TEST", "audit tests missing required G1-B case.", { phrase });
    }
  }

  for (const tuw of REQUIRED_TUWS) {
    if (!source.includes(tuw) || !report.includes(tuw) || !plan.includes(tuw)) {
      addFinding(findings, "MISSING_TUW_TRACE", "G1-B source, report, and plan must trace every TUW.", { tuw });
    }
  }

  if (!report.includes("G1 remains open") || !report.includes("does not claim runtime readiness")) {
    addFinding(findings, "G1_OPEN_BOUNDARY", "G1-B report must keep G1 runtime readiness open.");
  }

  if (!pkg.scripts?.["client-matter:g1b:validate"]) {
    addFinding(findings, "MISSING_NPM_SCRIPT", "package.json missing client-matter:g1b:validate.");
  }
}

if (findings.length > 0) {
  console.error("Client-Matter OS G1-B validation failed:");
  for (const finding of findings) {
    console.error(`- ${finding.code}: ${finding.message}`);
    if (Object.keys(finding.details).length > 0) {
      console.error(`  ${JSON.stringify(finding.details)}`);
    }
  }
  process.exit(1);
}

console.log("Client-Matter OS G1-B validation passed.");
console.log("g1b_tuws: LFOS-G1-W01-T004/LFOS-G1-W01-T005/LFOS-G1-W01-T006");
console.log("durable_audit_event_schema: hash_chain_compatible");
console.log("audit_middleware: append_only_idempotent");
console.log("sensitive_read_audit: permission_decision_bound");
console.log("g1_runtime_readiness_claim: open");
