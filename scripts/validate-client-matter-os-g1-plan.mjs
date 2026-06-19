#!/usr/bin/env node
import { readFile, stat } from "node:fs/promises";
import path from "node:path";
import process from "node:process";

const ROOT = path.resolve("docs/reorganization/client-matter-os");

const REQUIRED_FILES = [
  "10-roadmap-and-gates.md",
  "11-full-tuw-catalog.md",
  "17-g1-g2-sequencing-adr.md",
  "18-g1-trust-foundation-plan.md"
];

const REQUIRED_PLAN_PHRASES = [
  "G1 Trust Foundation Entry Plan",
  "does not claim G1 runtime readiness",
  "Existing Evidence",
  "Runtime Evidence Still Required",
  "PR Slice Plan",
  "LFOS-G1-W01-T016",
  "Planning artifacts, descriptor catalogs, synthetic fixtures, and contract validators are entry evidence only"
];

const REQUIRED_PERMISSION_DECISIONS = ["allow", "deny", "review_required", "approval_required"];
const REQUIRED_PERMISSION_INVARIANTS = [
  "deny_over_allow",
  "cross_tenant_fails_closed",
  "permission_decision_can_emit_audit_hint"
];
const REQUIRED_AUDIT_FIELDS = [
  "tenant_id",
  "actor",
  "action",
  "object",
  "outcome",
  "decision",
  "previous_event_hash",
  "event_hash"
];

function addFinding(findings, code, message, details = {}) {
  findings.push({ code, message, details });
}

async function exists(filePath) {
  try {
    await stat(filePath);
    return true;
  } catch {
    return false;
  }
}

async function readText(filePath) {
  return readFile(filePath, "utf8");
}

async function readJson(filePath) {
  return JSON.parse(await readText(filePath));
}

function tableRows(markdown, heading, nextHeading) {
  const start = markdown.indexOf(heading);
  if (start === -1) return [];
  const rest = markdown.slice(start + heading.length);
  const end = nextHeading ? rest.indexOf(nextHeading) : -1;
  const section = end === -1 ? rest : rest.slice(0, end);
  return section
    .split("\n")
    .filter((line) => line.startsWith("| "))
    .filter((line) => !line.includes("---"));
}

const findings = [];

for (const file of REQUIRED_FILES) {
  const filePath = path.join(ROOT, file);
  if (!(await exists(filePath))) {
    addFinding(findings, "MISSING_FILE", `Missing G1 planning dependency: ${file}`);
  }
}

const requiredRepoFiles = [
  "contracts/permission-kernel-contract.json",
  "contracts/audit-compliance-contract.json",
  "packages/authz/README.md",
  "packages/audit/README.md",
  "scripts/validate-rp02-permission-kernel-contract.mjs",
  "scripts/validate-rp03-audit-architecture.mjs"
];

for (const file of requiredRepoFiles) {
  if (!(await exists(path.resolve(file)))) {
    addFinding(findings, "MISSING_REPO_SURFACE", `Missing G1 repo evidence surface: ${file}`);
  }
}

if (findings.length === 0) {
  const plan = await readText(path.join(ROOT, "18-g1-trust-foundation-plan.md"));
  const tuw = await readText(path.join(ROOT, "11-full-tuw-catalog.md"));
  const sequencing = await readText(path.join(ROOT, "17-g1-g2-sequencing-adr.md"));
  const pkg = await readJson(path.resolve("package.json"));
  const permission = await readJson(path.resolve("contracts/permission-kernel-contract.json"));
  const audit = await readJson(path.resolve("contracts/audit-compliance-contract.json"));

  for (const phrase of REQUIRED_PLAN_PHRASES) {
    if (!plan.includes(phrase)) {
      addFinding(findings, "MISSING_PLAN_PHRASE", "G1 plan missing required boundary phrase.", { phrase });
    }
  }

  if (!sequencing.includes("G2 must not claim runtime write readiness before G1 evidence exists")) {
    addFinding(findings, "G1_G2_SEQUENCE_BOUNDARY", "G1 plan depends on ADR-G0-004 sequential runtime gate boundary.");
  }

  const g1Rows = tableRows(tuw, "## TUW Rows", "## Use in Vault-Style PRs").filter((line) =>
    line.startsWith("| LFOS-G1-")
  );
  if (g1Rows.length !== 16) {
    addFinding(findings, "G1_TUW_COUNT", "G1 TUW catalog must preserve 16 G1 rows.", {
      expected: 16,
      actual: g1Rows.length
    });
  }

  for (let index = 1; index <= 16; index += 1) {
    const tuwId = `LFOS-G1-W01-T${String(index).padStart(3, "0")}`;
    if (!plan.includes(tuwId) || !tuw.includes(tuwId)) {
      addFinding(findings, "MISSING_G1_TUW", "G1 plan and catalog must both include every G1 TUW.", { tuwId });
    }
  }

  for (const decision of REQUIRED_PERMISSION_DECISIONS) {
    if (!permission.required_decisions?.includes(decision)) {
      addFinding(findings, "MISSING_PERMISSION_DECISION", "Permission contract missing required decision.", { decision });
    }
  }

  for (const invariant of REQUIRED_PERMISSION_INVARIANTS) {
    if (!permission.invariants?.includes(invariant)) {
      addFinding(findings, "MISSING_PERMISSION_INVARIANT", "Permission contract missing required invariant.", {
        invariant
      });
    }
  }

  if (audit.event_contract?.append_only !== true) {
    addFinding(findings, "AUDIT_APPEND_ONLY", "Audit contract must require append-only events.");
  }

  for (const field of REQUIRED_AUDIT_FIELDS) {
    if (!audit.event_contract?.required_fields?.includes(field)) {
      addFinding(findings, "MISSING_AUDIT_FIELD", "Audit contract missing G1 required audit event field.", { field });
    }
  }

  const scripts = pkg.scripts ?? {};
  for (const scriptName of [
    "client-matter:g0:validate",
    "client-matter:g1:plan:validate",
    "rp02:permission-kernel:validate",
    "rp03:audit:validate",
    "validate"
  ]) {
    if (!scripts[scriptName]) {
      addFinding(findings, "MISSING_NPM_SCRIPT", "Missing required validation script.", { scriptName });
    }
  }
}

if (findings.length > 0) {
  console.error("Client-Matter OS G1 plan validation failed:");
  for (const finding of findings) {
    console.error(`- ${finding.code}: ${finding.message}`);
    if (Object.keys(finding.details).length > 0) {
      console.error(`  ${JSON.stringify(finding.details)}`);
    }
  }
  process.exit(1);
}

console.log("Client-Matter OS G1 plan validation passed.");
console.log("g1_tuw_rows: 16/16");
console.log("permission_decisions: allow/deny/review_required/approval_required");
console.log("permission_invariants: deny_over_allow/cross_tenant_fails_closed/audit_hint");
console.log("audit_required_fields: tenant/actor/action/object/outcome/decision/hash_chain");
console.log("runtime_readiness_claim: open");
