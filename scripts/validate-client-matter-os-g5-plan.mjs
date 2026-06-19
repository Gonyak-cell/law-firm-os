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
  "40-g4-f-dms-ui-audit-closeout-report.md",
  "41-g5-billing-finance-entry-plan.md",
];

const REQUIRED_REPO_SURFACES = [
  "contracts/time-expense-core-contract.json",
  "contracts/billing-core-contract.json",
  "contracts/payments-core-contract.json",
  "contracts/settlement-core-contract.json",
  "packages/time-expense/README.md",
  "packages/billing/README.md",
  "packages/payments/README.md",
  "packages/settlement/README.md",
  "scripts/validate-rp11-time-expense-core-contract.mjs",
  "scripts/validate-rp12-billing-core-contract.mjs",
  "scripts/validate-rp13-payments-core-contract.mjs",
  "scripts/validate-rp14-settlement-core-contract.mjs",
];

const REQUIRED_PLAN_PHRASES = [
  "G5 Billing Finance Entry Plan",
  "This plan opens G5 planning only",
  "does not claim G5 runtime readiness",
  "Billing and Finance work remains prohibited unless G4 has produced valid Matter",
  "Runtime Evidence Still Required",
  "PR Slice Plan",
  "G5 must not claim Billing/Finance runtime readiness before G1, G2, G3, and G4 evidence",
  "Planning artifacts, descriptor catalogs, generated RP11/RP12/RP13/RP14 closeout packs, and contract validators are entry evidence only",
];

const REQUIRED_RISK_IDS = ["R-001", "R-006", "R-013", "R-014", "R-015"];
const REQUIRED_RISK_PHRASES = [
  "CRM과 Billing의 Client 중복",
  "Invoice 확정 후 직접수정",
  "Settlement run 수정",
  "Tax invoice 재처리 오류",
  "Descriptor를 runtime으로 오인",
];

const REQUIRED_SCOPE_MARKERS = [
  "TimeEntry",
  "RateCard",
  "FeeArrangement",
  "Expense",
  "Disbursement",
  "WIP",
  "PreBill",
  "Invoice",
  "TaxInvoice",
  "Payment",
  "ARBalance",
  "JournalEntry",
  "SettlementRun",
  "OriginationCredit",
  "WorkingCredit",
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
    addFinding(findings, "MISSING_FILE", `Missing G5 planning dependency: ${file}`);
  }
}

for (const file of REQUIRED_REPO_SURFACES) {
  if (!(await exists(path.resolve(file)))) {
    addFinding(findings, "MISSING_REPO_SURFACE", `Missing G5 repo evidence surface: ${file}`);
  }
}

if (findings.length === 0) {
  const roadmap = await readText(path.join(ROOT, "10-roadmap-and-gates.md"));
  const tuw = await readText(path.join(ROOT, "11-full-tuw-catalog.md"));
  const risks = await readText(path.join(ROOT, "12-risk-register.md"));
  const workflow = await readText(path.join(ROOT, "13-workflow-state-and-folder-checklist.md"));
  const g4Closeout = await readText(path.join(ROOT, "40-g4-f-dms-ui-audit-closeout-report.md"));
  const plan = await readText(path.join(ROOT, "41-g5-billing-finance-entry-plan.md"));
  const timeExpenseReadme = await readText(path.resolve("packages/time-expense/README.md"));
  const billingReadme = await readText(path.resolve("packages/billing/README.md"));
  const paymentsReadme = await readText(path.resolve("packages/payments/README.md"));
  const settlementReadme = await readText(path.resolve("packages/settlement/README.md"));
  const timeExpenseContract = await readJson(path.resolve("contracts/time-expense-core-contract.json"));
  const billingContract = await readJson(path.resolve("contracts/billing-core-contract.json"));
  const paymentsContract = await readJson(path.resolve("contracts/payments-core-contract.json"));
  const settlementContract = await readJson(path.resolve("contracts/settlement-core-contract.json"));
  const pkg = await readJson(path.resolve("package.json"));

  for (const phrase of REQUIRED_PLAN_PHRASES) {
    if (!plan.includes(phrase)) {
      addFinding(findings, "MISSING_PLAN_PHRASE", "G5 plan missing required boundary phrase.", { phrase });
    }
  }

  if (!roadmap.includes("G5") || !roadmap.includes("Time/WIP/PreBill/Invoice/Payment/AR runtime 작동")) {
    addFinding(findings, "MISSING_ROADMAP_GATE", "Roadmap must preserve the G5 Revenue Gate.");
  }

  for (const workflowMarker of ["Time / WIP", "Pre-bill / Invoice", "수금 / AR", "정산"]) {
    if (!workflow.includes(workflowMarker)) {
      addFinding(findings, "MISSING_G5_WORKFLOW", "Workflow checklist must preserve G5 workflow marker.", {
        workflowMarker,
      });
    }
  }

  if (!g4Closeout.includes("G4-F DMS UI Audit Closeout Report") || !g4Closeout.includes("dms_runtime_readiness_claim")) {
    addFinding(findings, "G4_HANDOFF_EVIDENCE", "G5 plan must depend on G4-F DMS closeout evidence.");
  }

  const g5Rows = tableRows(tuw, "## TUW Rows", "## Use in Vault-Style PRs").filter((line) => line.startsWith("| LFOS-G5-"));
  if (g5Rows.length !== 30) {
    addFinding(findings, "G5_TUW_COUNT", "G5 TUW catalog must preserve 30 G5 rows.", {
      expected: 30,
      actual: g5Rows.length,
    });
  }

  for (let index = 1; index <= 16; index += 1) {
    const tuwId = `LFOS-G5-W07-T${String(index).padStart(3, "0")}`;
    if (!plan.includes(tuwId) || !tuw.includes(tuwId)) {
      addFinding(findings, "MISSING_G5_BILLING_TUW", "G5 plan and catalog must both include every Billing TUW.", { tuwId });
    }
  }

  for (let index = 1; index <= 14; index += 1) {
    const tuwId = `LFOS-G5-W08-T${String(index).padStart(3, "0")}`;
    if (!plan.includes(tuwId) || !tuw.includes(tuwId)) {
      addFinding(findings, "MISSING_G5_FINANCE_TUW", "G5 plan and catalog must both include every Finance TUW.", { tuwId });
    }
  }

  for (const riskId of REQUIRED_RISK_IDS) {
    if (!risks.includes(riskId) || !plan.includes(riskId)) {
      addFinding(findings, "MISSING_G5_RISK", "Risk register and G5 plan must both include core G5 risk IDs.", { riskId });
    }
  }

  for (const phrase of REQUIRED_RISK_PHRASES) {
    if (!risks.includes(phrase)) {
      addFinding(findings, "MISSING_G5_RISK_PHRASE", "Risk register missing G5 risk phrase.", { phrase });
    }
  }

  const contracts = [
    ["RP11", timeExpenseContract, "dispatches_time_entry_runtime"],
    ["RP12", billingContract, "dispatches_invoice_runtime"],
    ["RP13", paymentsContract, "dispatches_payments_runtime"],
    ["RP14", settlementContract, "dispatches_settlement_runtime"],
  ];
  for (const [programId, contract, runtimeFlag] of contracts) {
    if (
      contract.program?.program_id !== programId ||
      contract.program?.descriptor_only !== true ||
      contract.no_write_attestation?.writes_product_state !== false ||
      contract.no_write_attestation?.[runtimeFlag] !== false
    ) {
      addFinding(findings, "G5_CONTRACT_BOUNDARY", "G5 contract must remain descriptor-only no-runtime entry evidence.", {
        programId,
      });
    }
  }

  for (const [readmeName, readme, packId, marker] of [
    ["time-expense", timeExpenseReadme, "CP00-363", "no time entry"],
    ["billing", billingReadme, "CP00-391", "no billing"],
    ["payments", paymentsReadme, "CP00-425", "no payments"],
    ["settlement", settlementReadme, "CP00-452", "no settlement"],
  ]) {
    for (const phrase of [packId, "descriptor-only", marker]) {
      if (!readme.includes(phrase)) {
        addFinding(findings, "G5_README_BOUNDARY", "G5 README missing descriptor boundary marker.", {
          readmeName,
          phrase,
        });
      }
    }
  }

  for (const marker of REQUIRED_SCOPE_MARKERS) {
    if (!plan.includes(marker)) {
      addFinding(findings, "G5_SCOPE_MARKER", "G5 plan must include expected scope marker.", { marker });
    }
  }

  const scripts = pkg.scripts ?? {};
  for (const scriptName of [
    "client-matter:g4:plan:validate",
    "client-matter:g4f:validate",
    "client-matter:g5:plan:validate",
    "rp11:time-expense-core:validate",
    "rp12:billing-core:validate",
    "rp13:payments-core:validate",
    "rp14:settlement-core:validate",
    "validate",
  ]) {
    if (!scripts[scriptName]) {
      addFinding(findings, "MISSING_NPM_SCRIPT", "Missing required validation script.", { scriptName });
    }
  }
}

if (findings.length > 0) {
  console.error("Client-Matter OS G5 plan validation failed:");
  for (const finding of findings) {
    console.error(`- ${finding.code}: ${finding.message}`);
    if (Object.keys(finding.details).length > 0) {
      console.error(`  ${JSON.stringify(finding.details)}`);
    }
  }
  process.exit(1);
}

console.log("Client-Matter OS G5 plan validation passed.");
console.log("g5_tuw_rows: 30/30");
console.log("billing_scope: TimeEntry/RateCard/FeeArrangement/WIP/PreBill/Invoice/TaxInvoice");
console.log("finance_scope: Payment/ARBalance/JournalEntry/SettlementRun/OriginationCredit/WorkingCredit");
console.log("g4_handoff_boundary: required_before_revenue_runtime");
console.log("g5_runtime_readiness_claim: open");
