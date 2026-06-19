#!/usr/bin/env node
import { readFile, stat } from "node:fs/promises";
import path from "node:path";
import process from "node:process";

const ROOT = path.resolve("docs/reorganization/client-matter-os");

const REQUIRED_FILES = [
  "10-roadmap-and-gates.md",
  "11-full-tuw-catalog.md",
  "12-risk-register.md",
  "17-g1-g2-sequencing-adr.md",
  "23-g2-party-master-entry-plan.md",
  "27-g2-d-ui-closeout-report.md",
  "28-g3-crm-intake-entry-plan.md",
];

const REQUIRED_REPO_SURFACES = [
  "contracts/crm-core-contract.json",
  "contracts/intake-core-contract.json",
  "packages/crm/README.md",
  "packages/crm/src/index.js",
  "packages/intake/README.md",
  "packages/intake/src/index.js",
  "scripts/validate-rp09-crm-core-contract.mjs",
  "scripts/validate-rp10-intake-core-contract.mjs",
];

const REQUIRED_PLAN_PHRASES = [
  "G3 CRM Intake Entry Plan",
  "This plan opens G3 planning only",
  "does not claim G3 runtime readiness",
  "Opportunity-to-Matter shortcut remains prohibited",
  "Runtime Evidence Still Required",
  "PR Slice Plan",
  "G3 must not claim Intake-to-Matter runtime readiness before G1 and G2 evidence",
  "Planning artifacts, descriptor catalogs, generated RP09/RP10 closeout packs, and contract validators are entry evidence only",
];

const REQUIRED_RISK_IDS = ["R-001", "R-002", "R-003"];
const REQUIRED_RISK_PHRASES = [
  "CRM과 Billing의 Client 중복",
  "Opportunity가 Matter로 직접 전환",
  "Conflict memo가 CRM에 노출",
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
    addFinding(findings, "MISSING_FILE", `Missing G3 planning dependency: ${file}`);
  }
}

for (const file of REQUIRED_REPO_SURFACES) {
  if (!(await exists(path.resolve(file)))) {
    addFinding(findings, "MISSING_REPO_SURFACE", `Missing G3 repo evidence surface: ${file}`);
  }
}

if (findings.length === 0) {
  const roadmap = await readText(path.join(ROOT, "10-roadmap-and-gates.md"));
  const tuw = await readText(path.join(ROOT, "11-full-tuw-catalog.md"));
  const risks = await readText(path.join(ROOT, "12-risk-register.md"));
  const sequencing = await readText(path.join(ROOT, "17-g1-g2-sequencing-adr.md"));
  const g2Plan = await readText(path.join(ROOT, "23-g2-party-master-entry-plan.md"));
  const g2Closeout = await readText(path.join(ROOT, "27-g2-d-ui-closeout-report.md"));
  const plan = await readText(path.join(ROOT, "28-g3-crm-intake-entry-plan.md"));
  const crmReadme = await readText(path.resolve("packages/crm/README.md"));
  const intakeReadme = await readText(path.resolve("packages/intake/README.md"));
  const crmContract = await readJson(path.resolve("contracts/crm-core-contract.json"));
  const intakeContract = await readJson(path.resolve("contracts/intake-core-contract.json"));
  const pkg = await readJson(path.resolve("package.json"));

  for (const phrase of REQUIRED_PLAN_PHRASES) {
    if (!plan.includes(phrase)) {
      addFinding(findings, "MISSING_PLAN_PHRASE", "G3 plan missing required boundary phrase.", { phrase });
    }
  }

  if (!roadmap.includes("G3") || !roadmap.includes("CRM → Intake → Matter 전환이 gate로 작동")) {
    addFinding(findings, "MISSING_ROADMAP_GATE", "Roadmap must preserve the G3 Intake-to-Matter gate.");
  }

  if (!sequencing.includes("G2 must not claim runtime write readiness before G1 evidence exists")) {
    addFinding(findings, "G1_G2_SEQUENCE_BOUNDARY", "G3 plan depends on the existing G1/G2 sequential runtime gate boundary.");
  }

  if (!g2Plan.includes("G2 must not claim runtime write readiness before G1 evidence is human-reviewed")) {
    addFinding(findings, "G2_RUNTIME_BOUNDARY", "G3 entry must inherit the G2 runtime-readiness boundary.");
  }

  if (!g2Closeout.includes("CRM, Matter, and Billing reference evidence") || !g2Closeout.includes("g2_runtime_write_readiness_claim")) {
    addFinding(findings, "G2_HANDOFF_EVIDENCE", "G2-D closeout must preserve CRM/Matter/Billing handoff evidence and open readiness.");
  }

  const g3Rows = tableRows(tuw, "## TUW Rows", "## Use in Vault-Style PRs").filter((line) =>
    line.startsWith("| LFOS-G3-")
  );
  if (g3Rows.length !== 26) {
    addFinding(findings, "G3_TUW_COUNT", "G3 TUW catalog must preserve 26 G3 rows.", {
      expected: 26,
      actual: g3Rows.length,
    });
  }

  for (let index = 1; index <= 12; index += 1) {
    const tuwId = `LFOS-G3-W03-T${String(index).padStart(3, "0")}`;
    if (!plan.includes(tuwId) || !tuw.includes(tuwId)) {
      addFinding(findings, "MISSING_G3_CRM_TUW", "G3 plan and catalog must both include every CRM TUW.", { tuwId });
    }
  }

  for (let index = 1; index <= 14; index += 1) {
    const tuwId = `LFOS-G3-W04-T${String(index).padStart(3, "0")}`;
    if (!plan.includes(tuwId) || !tuw.includes(tuwId)) {
      addFinding(findings, "MISSING_G3_INTAKE_TUW", "G3 plan and catalog must both include every Intake TUW.", { tuwId });
    }
  }

  for (const riskId of REQUIRED_RISK_IDS) {
    if (!risks.includes(riskId) || !plan.includes(riskId)) {
      addFinding(findings, "MISSING_G3_RISK", "Risk register and G3 plan must both include core G3 risk IDs.", { riskId });
    }
  }

  for (const phrase of REQUIRED_RISK_PHRASES) {
    if (!risks.includes(phrase)) {
      addFinding(findings, "MISSING_G3_RISK_PHRASE", "Risk register missing G3 risk phrase.", { phrase });
    }
  }

  if (crmContract.program?.program_id !== "RP09" || crmContract.program?.descriptor_only !== true) {
    addFinding(findings, "CRM_CONTRACT_BOUNDARY", "CRM contract must remain RP09 descriptor-only entry evidence.");
  }

  if (intakeContract.program?.program_id !== "RP10" || intakeContract.program?.descriptor_only !== true) {
    addFinding(findings, "INTAKE_CONTRACT_BOUNDARY", "Intake contract must remain RP10 descriptor-only entry evidence.");
  }

  for (const phrase of ["Lead", "Opportunity", "Activity", "Proposal", "Campaign", "Referral"]) {
    if (!crmReadme.includes(phrase) && !JSON.stringify(crmContract).includes(phrase)) {
      addFinding(findings, "CRM_SCOPE_MARKER", "CRM evidence must include expected scope marker.", { phrase });
    }
  }

  for (const phrase of ["ConflictCheck", "ConflictHit", "Waiver", "Engagement", "Fee Terms"]) {
    if (!intakeReadme.includes(phrase) && !JSON.stringify(intakeContract).includes(phrase)) {
      addFinding(findings, "INTAKE_SCOPE_MARKER", "Intake evidence must include expected scope marker.", { phrase });
    }
  }

  const scripts = pkg.scripts ?? {};
  for (const scriptName of [
    "client-matter:g0:validate",
    "client-matter:g1:plan:validate",
    "client-matter:g1a:validate",
    "client-matter:g1b:validate",
    "client-matter:g1c:validate",
    "client-matter:g1d:validate",
    "client-matter:g2:plan:validate",
    "client-matter:g2a:validate",
    "client-matter:g2b:validate",
    "client-matter:g2c:validate",
    "client-matter:g2d:validate",
    "client-matter:g3:plan:validate",
    "rp09:crm-core:validate",
    "rp10:intake-core:validate",
    "validate",
  ]) {
    if (!scripts[scriptName]) {
      addFinding(findings, "MISSING_NPM_SCRIPT", "Missing required validation script.", { scriptName });
    }
  }
}

if (findings.length > 0) {
  console.error("Client-Matter OS G3 plan validation failed:");
  for (const finding of findings) {
    console.error(`- ${finding.code}: ${finding.message}`);
    if (Object.keys(finding.details).length > 0) {
      console.error(`  ${JSON.stringify(finding.details)}`);
    }
  }
  process.exit(1);
}

console.log("Client-Matter OS G3 plan validation passed.");
console.log("g3_tuw_rows: 26/26");
console.log("crm_scope: Lead/Opportunity/CRMActivity/Proposal/Referral/Campaign");
console.log("intake_scope: IntakeRequest/ConflictCheck/ConflictHit/Waiver/Engagement/FeeTerms");
console.log("shortcut_boundary: opportunity_to_matter_prohibited");
console.log("g3_runtime_readiness_claim: open");
