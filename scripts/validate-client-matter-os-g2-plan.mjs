#!/usr/bin/env node
import { readFile, stat } from "node:fs/promises";
import path from "node:path";
import process from "node:process";

const ROOT = path.resolve("docs/reorganization/client-matter-os");

const REQUIRED_FILES = [
  "11-full-tuw-catalog.md",
  "14-billing-profile-ownership-adr.md",
  "17-g1-g2-sequencing-adr.md",
  "23-g2-party-master-entry-plan.md",
  "24-g2-a-party-schema-report.md",
  "25-g2-b-relationship-billing-profile-report.md",
  "26-g2-c-duplicate-search-merge-report.md",
  "27-g2-d-ui-closeout-report.md"
];

const REQUIRED_REPO_SURFACES = [
  "contracts/master-data-contract.json",
  "packages/master-data/src/model.js",
  "packages/master-data/src/service.js",
  "packages/master-data/src/registry.js",
  "packages/master-data/README.md",
  "scripts/validate-rp04-master-data-contract.mjs"
];

const REQUIRED_PLAN_PHRASES = [
  "G2 Party Master Entry Plan",
  "This plan opens G2 planning and schema work only",
  "does not claim G2 runtime write readiness",
  "Runtime Evidence Still Required",
  "PR Slice Plan",
  "G2 must not claim runtime write readiness before G1 evidence is human-reviewed",
  "Planning artifacts, descriptor catalogs, generated RP04 closeout packs, and contract validators are entry evidence only"
];

const REQUIRED_MODELS = [
  "Entity",
  "Person",
  "Organization",
  "ClientGroup",
  "Relationship",
  "ContactPoint",
  "BillingProfile"
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
    addFinding(findings, "MISSING_FILE", `Missing G2 planning dependency: ${file}`);
  }
}

for (const file of REQUIRED_REPO_SURFACES) {
  if (!(await exists(path.resolve(file)))) {
    addFinding(findings, "MISSING_REPO_SURFACE", `Missing G2 repo evidence surface: ${file}`);
  }
}

if (findings.length === 0) {
  const plan = await readText(path.join(ROOT, "23-g2-party-master-entry-plan.md"));
  const tuw = await readText(path.join(ROOT, "11-full-tuw-catalog.md"));
  const billingAdr = await readText(path.join(ROOT, "14-billing-profile-ownership-adr.md"));
  const sequencingAdr = await readText(path.join(ROOT, "17-g1-g2-sequencing-adr.md"));
  const masterDataModel = await readText(path.resolve("packages/master-data/src/model.js"));
  const masterDataContract = await readJson(path.resolve("contracts/master-data-contract.json"));
  const pkg = await readJson(path.resolve("package.json"));

  for (const phrase of REQUIRED_PLAN_PHRASES) {
    if (!plan.includes(phrase)) {
      addFinding(findings, "MISSING_PLAN_PHRASE", "G2 plan missing required boundary phrase.", { phrase });
    }
  }

  const g2Rows = tableRows(tuw, "## TUW Rows", "## Use in Vault-Style PRs").filter((line) =>
    line.startsWith("| LFOS-G2-")
  );
  if (g2Rows.length !== 14) {
    addFinding(findings, "G2_TUW_COUNT", "G2 TUW catalog must preserve 14 G2 rows.", {
      expected: 14,
      actual: g2Rows.length
    });
  }

  for (let index = 1; index <= 14; index += 1) {
    const tuwId = `LFOS-G2-W02-T${String(index).padStart(3, "0")}`;
    if (!plan.includes(tuwId) || !tuw.includes(tuwId)) {
      addFinding(findings, "MISSING_G2_TUW", "G2 plan and catalog must both include every G2 TUW.", { tuwId });
    }
  }

  if (!billingAdr.includes("Party & Relationship Master") || !billingAdr.includes("canonical identity")) {
    addFinding(findings, "BILLING_PROFILE_OWNERSHIP", "BillingProfile ownership ADR must keep Party Master as canonical owner.");
  }

  if (!sequencingAdr.includes("G2 must not claim runtime write readiness before G1 evidence exists")) {
    addFinding(findings, "G1_G2_SEQUENCE_BOUNDARY", "G2 plan depends on ADR-G0-004 sequential runtime gate boundary.");
  }

  for (const model of REQUIRED_MODELS) {
    if (!masterDataModel.includes(`createMasterData${model}`) && model !== "Entity") {
      addFinding(findings, "MISSING_MASTER_DATA_FACTORY", "Master Data model source missing expected factory.", { model });
    }
    if (model === "Entity" && !masterDataModel.includes("createMasterDataEntity")) {
      addFinding(findings, "MISSING_MASTER_DATA_FACTORY", "Master Data model source missing expected factory.", { model });
    }
  }

  for (const model of REQUIRED_MODELS) {
    const contractText = JSON.stringify(masterDataContract);
    if (!contractText.includes(model)) {
      addFinding(findings, "MISSING_MASTER_DATA_CONTRACT_MODEL", "Master Data contract missing expected model marker.", { model });
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
    "rp04:master-data:validate",
    "validate"
  ]) {
    if (!scripts[scriptName]) {
      addFinding(findings, "MISSING_NPM_SCRIPT", "Missing required validation script.", { scriptName });
    }
  }
}

if (findings.length > 0) {
  console.error("Client-Matter OS G2 plan validation failed:");
  for (const finding of findings) {
    console.error(`- ${finding.code}: ${finding.message}`);
    if (Object.keys(finding.details).length > 0) {
      console.error(`  ${JSON.stringify(finding.details)}`);
    }
  }
  process.exit(1);
}

console.log("Client-Matter OS G2 plan validation passed.");
console.log("g2_tuw_rows: 14/14");
console.log("billing_profile_owner: party_master");
console.log("g1_g2_sequence: runtime_write_claim_blocked_until_g1_review");
console.log("master_data_surfaces: contract/model/service/registry/readme");
console.log("g2_runtime_write_readiness_claim: open");
