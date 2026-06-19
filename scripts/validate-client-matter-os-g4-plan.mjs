#!/usr/bin/env node
import { readFile, stat } from "node:fs/promises";
import path from "node:path";
import process from "node:process";

const ROOT = path.resolve("docs/reorganization/client-matter-os");

const REQUIRED_FILES = [
  "10-roadmap-and-gates.md",
  "11-full-tuw-catalog.md",
  "12-risk-register.md",
  "13-workflow-state-and-folder-checklist.md",
  "17-g1-g2-sequencing-adr.md",
  "28-g3-crm-intake-entry-plan.md",
  "33-g3-e-intake-ui-closeout-report.md",
  "34-g4-matter-dms-entry-plan.md",
];

const REQUIRED_REPO_SURFACES = [
  "contracts/matter-core-contract.json",
  "contracts/dms-core-contract.json",
  "contracts/email-dms-core-contract.json",
  "packages/matter/README.md",
  "packages/matter/src/model.js",
  "packages/matter/src/service.js",
  "packages/dms/README.md",
  "packages/dms/src/model.js",
  "packages/dms/src/service.js",
  "packages/email-dms/README.md",
  "scripts/validate-rp05-matter-core-contract.mjs",
  "scripts/validate-rp06-dms-core-contract.mjs",
  "scripts/validate-rp08-email-dms-core-contract.mjs",
];

const REQUIRED_PLAN_PHRASES = [
  "G4 Matter DMS Entry Plan",
  "This plan opens G4 planning only",
  "does not claim G4 runtime readiness",
  "Matter opening remains prohibited unless G3 has produced a valid",
  "Runtime Evidence Still Required",
  "PR Slice Plan",
  "G4 must not claim Matter/DMS runtime readiness before G1, G2, and G3 evidence",
  "Planning artifacts, descriptor catalogs, generated RP05/RP06/RP08 closeout packs, and contract validators are entry evidence only",
];

const REQUIRED_RISK_IDS = ["R-005", "R-011", "R-015"];
const REQUIRED_RISK_PHRASES = [
  "AI가 DMS 권한 우회",
  "DMS search index ACL 누락",
  "Descriptor를 runtime으로 오인",
];

const REQUIRED_MATTER_MARKERS = [
  "Matter",
  "MatterMember",
  "MatterTask",
  "MatterCalendarEvent",
];

const REQUIRED_DMS_MARKERS = [
  "DmsWorkspace",
  "DmsDocument",
  "DmsDocumentVersion",
  "DmsEmailThread",
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
    addFinding(findings, "MISSING_FILE", `Missing G4 planning dependency: ${file}`);
  }
}

for (const file of REQUIRED_REPO_SURFACES) {
  if (!(await exists(path.resolve(file)))) {
    addFinding(findings, "MISSING_REPO_SURFACE", `Missing G4 repo evidence surface: ${file}`);
  }
}

if (findings.length === 0) {
  const roadmap = await readText(path.join(ROOT, "10-roadmap-and-gates.md"));
  const tuw = await readText(path.join(ROOT, "11-full-tuw-catalog.md"));
  const risks = await readText(path.join(ROOT, "12-risk-register.md"));
  const workflow = await readText(path.join(ROOT, "13-workflow-state-and-folder-checklist.md"));
  const sequencing = await readText(path.join(ROOT, "17-g1-g2-sequencing-adr.md"));
  const g3Plan = await readText(path.join(ROOT, "28-g3-crm-intake-entry-plan.md"));
  const g3Closeout = await readText(path.join(ROOT, "33-g3-e-intake-ui-closeout-report.md"));
  const plan = await readText(path.join(ROOT, "34-g4-matter-dms-entry-plan.md"));
  const matterReadme = await readText(path.resolve("packages/matter/README.md"));
  const dmsReadme = await readText(path.resolve("packages/dms/README.md"));
  const emailDmsReadme = await readText(path.resolve("packages/email-dms/README.md"));
  const matterModel = await readText(path.resolve("packages/matter/src/model.js"));
  const dmsModel = await readText(path.resolve("packages/dms/src/model.js"));
  const matterContract = await readJson(path.resolve("contracts/matter-core-contract.json"));
  const dmsContract = await readJson(path.resolve("contracts/dms-core-contract.json"));
  const emailDmsContract = await readJson(path.resolve("contracts/email-dms-core-contract.json"));
  const pkg = await readJson(path.resolve("package.json"));

  for (const phrase of REQUIRED_PLAN_PHRASES) {
    if (!plan.includes(phrase)) {
      addFinding(findings, "MISSING_PLAN_PHRASE", "G4 plan missing required boundary phrase.", { phrase });
    }
  }

  if (!roadmap.includes("G4") || !roadmap.includes("Matter, DMS, deadline, task runtime 작동")) {
    addFinding(findings, "MISSING_ROADMAP_GATE", "Roadmap must preserve the G4 DMS/Matter Execution Gate.");
  }

  if (!workflow.includes("Matter Opening") || !workflow.includes("Matter, Team, ACL, DMS workspace")) {
    addFinding(findings, "MISSING_MATTER_WORKFLOW", "Workflow checklist must preserve Matter opening and DMS workspace handoff.");
  }

  if (!workflow.includes("Opportunity cannot become Matter directly")) {
    addFinding(findings, "OPPORTUNITY_MATTER_SHORTCUT", "Workflow checklist must keep direct Opportunity-to-Matter conversion prohibited.");
  }

  if (!sequencing.includes("G2 must not claim runtime write readiness before G1 evidence exists")) {
    addFinding(findings, "G1_G2_SEQUENCE_BOUNDARY", "G4 plan depends on the existing sequential runtime gate boundary.");
  }

  if (!g3Plan.includes("Opportunity-to-Matter shortcut remains prohibited")) {
    addFinding(findings, "G3_CLEARANCE_BOUNDARY", "G4 entry must inherit the G3 Opportunity-to-Matter shortcut prohibition.");
  }

  if (!g3Closeout.includes("Opportunity-to-Matter bypass blocking") || !g3Closeout.includes("g3_runtime_readiness_claim")) {
    addFinding(findings, "G3_HANDOFF_EVIDENCE", "G3-E closeout must preserve bypass blocking and open readiness.");
  }

  const g4Rows = tableRows(tuw, "## TUW Rows", "## Use in Vault-Style PRs").filter((line) =>
    line.startsWith("| LFOS-G4-")
  );
  if (g4Rows.length !== 30) {
    addFinding(findings, "G4_TUW_COUNT", "G4 TUW catalog must preserve 30 G4 rows.", {
      expected: 30,
      actual: g4Rows.length,
    });
  }

  for (let index = 1; index <= 14; index += 1) {
    const tuwId = `LFOS-G4-W05-T${String(index).padStart(3, "0")}`;
    if (!plan.includes(tuwId) || !tuw.includes(tuwId)) {
      addFinding(findings, "MISSING_G4_MATTER_TUW", "G4 plan and catalog must both include every Matter TUW.", { tuwId });
    }
  }

  for (let index = 1; index <= 16; index += 1) {
    const tuwId = `LFOS-G4-W06-T${String(index).padStart(3, "0")}`;
    if (!plan.includes(tuwId) || !tuw.includes(tuwId)) {
      addFinding(findings, "MISSING_G4_DMS_TUW", "G4 plan and catalog must both include every DMS TUW.", { tuwId });
    }
  }

  for (const riskId of REQUIRED_RISK_IDS) {
    if (!risks.includes(riskId) || !plan.includes(riskId)) {
      addFinding(findings, "MISSING_G4_RISK", "Risk register and G4 plan must both include core G4 risk IDs.", { riskId });
    }
  }

  for (const phrase of REQUIRED_RISK_PHRASES) {
    if (!risks.includes(phrase)) {
      addFinding(findings, "MISSING_G4_RISK_PHRASE", "Risk register missing G4 risk phrase.", { phrase });
    }
  }

  if (matterContract.program?.program_id !== "RP05" || matterContract.service_boundary?.descriptor_only !== true) {
    addFinding(findings, "MATTER_CONTRACT_BOUNDARY", "Matter contract must remain RP05 descriptor-only entry evidence.");
  }

  if (dmsContract.program?.program_id !== "RP06" || dmsContract.no_write_attestation?.writes_product_state !== false) {
    addFinding(findings, "DMS_CONTRACT_BOUNDARY", "DMS contract must remain RP06 no-write descriptor entry evidence.");
  }

  if (emailDmsContract.program?.program_id !== "RP08" || emailDmsContract.program?.descriptor_only !== true) {
    addFinding(findings, "EMAIL_DMS_CONTRACT_BOUNDARY", "Email-DMS contract must remain RP08 descriptor-only entry evidence.");
  }

  for (const phrase of ["CP00-197", "descriptor-only", "does not evaluate runtime permissions"]) {
    if (!matterReadme.includes(phrase)) {
      addFinding(findings, "MATTER_README_BOUNDARY", "Matter README missing descriptor boundary marker.", { phrase });
    }
  }

  for (const phrase of ["CP00-234", "descriptor-only", "does not dispatch DMS runtime services"]) {
    if (!dmsReadme.includes(phrase)) {
      addFinding(findings, "DMS_README_BOUNDARY", "DMS README missing descriptor boundary marker.", { phrase });
    }
  }

  for (const phrase of ["CP00-298", "descriptor-only", "no email runtime"]) {
    if (!emailDmsReadme.includes(phrase)) {
      addFinding(findings, "EMAIL_DMS_README_BOUNDARY", "Email-DMS README missing descriptor boundary marker.", { phrase });
    }
  }

  for (const marker of REQUIRED_MATTER_MARKERS) {
    if (!matterModel.includes(marker) && !JSON.stringify(matterContract).includes(marker)) {
      addFinding(findings, "MATTER_SCOPE_MARKER", "Matter evidence must include expected scope marker.", { marker });
    }
  }

  for (const marker of REQUIRED_DMS_MARKERS) {
    if (!dmsModel.includes(marker) && !JSON.stringify(dmsContract).includes(marker)) {
      addFinding(findings, "DMS_SCOPE_MARKER", "DMS evidence must include expected scope marker.", { marker });
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
    "client-matter:g3a:validate",
    "client-matter:g3b:validate",
    "client-matter:g3c:validate",
    "client-matter:g3d:validate",
    "client-matter:g3e:validate",
    "client-matter:g4:plan:validate",
    "rp05:matter-core:validate",
    "rp06:dms-core:validate",
    "rp08:email-dms-core:validate",
    "validate",
  ]) {
    if (!scripts[scriptName]) {
      addFinding(findings, "MISSING_NPM_SCRIPT", "Missing required validation script.", { scriptName });
    }
  }
}

if (findings.length > 0) {
  console.error("Client-Matter OS G4 plan validation failed:");
  for (const finding of findings) {
    console.error(`- ${finding.code}: ${finding.message}`);
    if (Object.keys(finding.details).length > 0) {
      console.error(`  ${JSON.stringify(finding.details)}`);
    }
  }
  process.exit(1);
}

console.log("Client-Matter OS G4 plan validation passed.");
console.log("g4_tuw_rows: 30/30");
console.log("matter_scope: Matter/MatterMember/MatterTask/MatterCalendarEvent");
console.log("dms_scope: DmsWorkspace/DmsDocument/DmsDocumentVersion/DmsEmailThread");
console.log("clearance_boundary: g3_clearance_required_before_matter_opening");
console.log("g4_runtime_readiness_claim: open");
