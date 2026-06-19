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
  "47-g5-f-settlement-finance-ui-closeout-report.md",
  "48-g6-analytics-ai-portal-entry-plan.md",
];

const REQUIRED_REPO_SURFACES = [
  "contracts/analytics-core-contract.json",
  "contracts/governance-core-contract.json",
  "contracts/ai-governance-core-contract.json",
  "contracts/ai-legal-workflows-core-contract.json",
  "contracts/client-portal-core-contract.json",
  "contracts/data-room-vdr-core-contract.json",
  "packages/analytics/README.md",
  "packages/governance/README.md",
  "packages/ai-governance/README.md",
  "packages/ai-legal-workflows/README.md",
  "packages/client-portal/README.md",
  "packages/data-room/README.md",
  "scripts/validate-rp15-analytics-core-contract.mjs",
  "scripts/validate-rp16-governance-core-contract.mjs",
  "scripts/validate-rp17-ai-governance-core-contract.mjs",
  "scripts/validate-rp18-ai-legal-workflows-core-contract.mjs",
  "scripts/validate-rp19-client-portal-core-contract.mjs",
  "scripts/validate-rp20-data-room-vdr-core-contract.mjs",
];

const REQUIRED_PLAN_PHRASES = [
  "G6 Analytics AI Portal Entry Plan",
  "This plan opens G6 planning only",
  "does not claim G6 runtime readiness",
  "AI and Portal work remains prohibited unless G1 through G5 have produced valid permission, audit, Matter, DMS, Billing, and Finance evidence",
  "Runtime Evidence Still Required",
  "PR Slice Plan",
  "G6 must not claim Analytics, AI, Portal, or Data Room runtime readiness before G1, G2, G3, G4, and G5 evidence",
  "Planning artifacts, descriptor catalogs, generated RP15/RP16/RP17/RP18/RP19/RP20 closeout packs, and contract validators are entry evidence only",
];

const REQUIRED_RISK_IDS = ["R-005", "R-007", "R-009", "R-015"];
const REQUIRED_RISK_PHRASES = [
  "AI가 DMS 권한 우회",
  "External portal overexposure",
  "Analytics가 source object 수정",
  "Descriptor를 runtime으로 오인",
];

const REQUIRED_SCOPE_MARKERS = [
  "AnalyticsEvent",
  "MatterProfitability",
  "ClientProfitability",
  "UtilizationMetric",
  "RealizationMetric",
  "AR aging dashboard",
  "ClientHealth UI",
  "Practice P&L",
  "Analytics export control",
  "ModelPolicy",
  "RetrievalRequest",
  "Permission-aware retrieval service",
  "PromptLog",
  "AIOutput",
  "Citation",
  "Human review queue",
  "AI disable switch",
  "Legal workflow model",
  "Workflow builder UI",
  "AI output export control",
  "ExternalUser",
  "PortalMatterProjection",
  "ExternalACL",
  "RFIRequest",
  "RFIResponse",
  "Client approval flow",
  "Secure link viewer",
  "DataRoom",
  "Portal audit coverage",
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

function normalized(text) {
  return text.replace(/\s+/g, " ").trim();
}

function hasFalseFlag(value, flag) {
  if (!value || typeof value !== "object") return false;
  if (value[flag] === false) return true;
  return Object.values(value).some((child) => hasFalseFlag(child, flag));
}

const findings = [];

for (const file of REQUIRED_FILES) {
  const filePath = path.join(ROOT, file);
  if (!(await exists(filePath))) {
    addFinding(findings, "MISSING_FILE", `Missing G6 planning dependency: ${file}`);
  }
}

for (const file of REQUIRED_REPO_SURFACES) {
  if (!(await exists(path.resolve(file)))) {
    addFinding(findings, "MISSING_REPO_SURFACE", `Missing G6 repo evidence surface: ${file}`);
  }
}

if (findings.length === 0) {
  const roadmap = await readText(path.join(ROOT, "10-roadmap-and-gates.md"));
  const tuw = await readText(path.join(ROOT, "11-full-tuw-catalog.md"));
  const risks = await readText(path.join(ROOT, "12-risk-register.md"));
  const workflow = await readText(path.join(ROOT, "13-workflow-state-and-folder-checklist.md"));
  const g5Closeout = await readText(path.join(ROOT, "47-g5-f-settlement-finance-ui-closeout-report.md"));
  const plan = await readText(path.join(ROOT, "48-g6-analytics-ai-portal-entry-plan.md"));
  const pkg = await readJson(path.resolve("package.json"));

  const contracts = [
    ["RP15", "contracts/analytics-core-contract.json", "dispatches_analytics_runtime"],
    ["RP16", "contracts/governance-core-contract.json", "dispatches_governance_runtime"],
    ["RP17", "contracts/ai-governance-core-contract.json", "dispatches_ai_governance_runtime"],
    ["RP18", "contracts/ai-legal-workflows-core-contract.json", "dispatches_ai_legal_workflows_runtime"],
    ["RP19", "contracts/client-portal-core-contract.json", "dispatches_client_portal_runtime"],
    ["RP20", "contracts/data-room-vdr-core-contract.json", "dispatches_data_room_runtime"],
  ];
  const readmes = [
    ["analytics", "packages/analytics/README.md", "CP00-479", "no analytics"],
    ["governance", "packages/governance/README.md", "CP00-513", "no governance"],
    ["ai-governance", "packages/ai-governance/README.md", "CP00-550", "no AI"],
    ["ai-legal-workflows", "packages/ai-legal-workflows/README.md", "CP00-582", "no AI legal workflows"],
    ["client-portal", "packages/client-portal/README.md", "CP00-609", "no client portal"],
    ["data-room", "packages/data-room/README.md", "CP00-644", "no Data Room"],
  ];

  const normalizedPlan = normalized(plan);
  for (const phrase of REQUIRED_PLAN_PHRASES) {
    if (!normalizedPlan.includes(normalized(phrase))) {
      addFinding(findings, "MISSING_PLAN_PHRASE", "G6 plan missing required boundary phrase.", { phrase });
    }
  }

  if (!roadmap.includes("G6") || !roadmap.includes("AI retrieval과 Portal이 ACL/audit 기반으로 작동")) {
    addFinding(findings, "MISSING_ROADMAP_GATE", "Roadmap must preserve the G6 AI/Portal Gate.");
  }

  for (const workflowMarker of ["AIOutput", "09 Analytics / BI", "10 AI Governance / Legal Workflows", "11 Client Portal / Data Room"]) {
    if (!workflow.includes(workflowMarker)) {
      addFinding(findings, "MISSING_G6_WORKFLOW", "Workflow checklist must preserve G6 workflow marker.", {
        workflowMarker,
      });
    }
  }

  if (!g5Closeout.includes("G5-F Settlement Finance UI Closeout Report") || !g5Closeout.includes("invoice-to-payment evidence")) {
    addFinding(findings, "G5_HANDOFF_EVIDENCE", "G6 plan must depend on G5-F Finance closeout evidence.");
  }

  const g6Rows = tableRows(tuw, "## TUW Rows", "## Use in Vault-Style PRs").filter((line) => line.startsWith("| LFOS-G6-"));
  if (g6Rows.length !== 32) {
    addFinding(findings, "G6_TUW_COUNT", "G6 TUW catalog must preserve 32 G6 rows.", {
      expected: 32,
      actual: g6Rows.length,
    });
  }

  for (let index = 1; index <= 10; index += 1) {
    const tuwId = `LFOS-G6-W09-T${String(index).padStart(3, "0")}`;
    if (!plan.includes(tuwId) || !tuw.includes(tuwId)) {
      addFinding(findings, "MISSING_G6_ANALYTICS_TUW", "G6 plan and catalog must both include every Analytics TUW.", {
        tuwId,
      });
    }
  }

  for (let index = 1; index <= 12; index += 1) {
    const tuwId = `LFOS-G6-W10-T${String(index).padStart(3, "0")}`;
    if (!plan.includes(tuwId) || !tuw.includes(tuwId)) {
      addFinding(findings, "MISSING_G6_AI_TUW", "G6 plan and catalog must both include every AI TUW.", { tuwId });
    }
  }

  for (let index = 1; index <= 10; index += 1) {
    const tuwId = `LFOS-G6-W11-T${String(index).padStart(3, "0")}`;
    if (!plan.includes(tuwId) || !tuw.includes(tuwId)) {
      addFinding(findings, "MISSING_G6_PORTAL_TUW", "G6 plan and catalog must both include every Portal TUW.", {
        tuwId,
      });
    }
  }

  for (const riskId of REQUIRED_RISK_IDS) {
    if (!risks.includes(riskId) || !plan.includes(riskId)) {
      addFinding(findings, "MISSING_G6_RISK", "Risk register and G6 plan must both include core G6 risk IDs.", {
        riskId,
      });
    }
  }

  for (const phrase of REQUIRED_RISK_PHRASES) {
    if (!risks.includes(phrase)) {
      addFinding(findings, "MISSING_G6_RISK_PHRASE", "Risk register missing G6 risk phrase.", { phrase });
    }
  }

  for (const [programId, contractPath, runtimeFlag] of contracts) {
    const contract = await readJson(path.resolve(contractPath));
    if (
      contract.program?.program_id !== programId ||
      contract.program?.descriptor_only !== true ||
      !hasFalseFlag(contract, "writes_product_state") ||
      !hasFalseFlag(contract, runtimeFlag)
    ) {
      addFinding(findings, "G6_CONTRACT_BOUNDARY", "G6 contract must remain descriptor-only no-runtime entry evidence.", {
        programId,
        runtimeFlag,
      });
    }
  }

  for (const [readmeName, readmePath, packId, marker] of readmes) {
    const readme = await readText(path.resolve(readmePath));
    for (const phrase of [packId, "descriptor-only", marker]) {
      if (!readme.includes(phrase)) {
        addFinding(findings, "G6_README_BOUNDARY", "G6 README missing descriptor boundary marker.", {
          readmeName,
          phrase,
        });
      }
    }
  }

  for (const marker of REQUIRED_SCOPE_MARKERS) {
    if (!plan.includes(marker)) {
      addFinding(findings, "G6_SCOPE_MARKER", "G6 plan must include expected scope marker.", { marker });
    }
  }

  const scripts = pkg.scripts ?? {};
  for (const scriptName of [
    "client-matter:g5f:validate",
    "client-matter:g6:plan:validate",
    "rp15:analytics-core:validate",
    "rp16:governance-core:validate",
    "rp17:ai-governance-core:validate",
    "rp18:ai-legal-workflows-core:validate",
    "rp19:client-portal-core:validate",
    "rp20:data-room-vdr-core:validate",
    "validate",
  ]) {
    if (!scripts[scriptName]) {
      addFinding(findings, "MISSING_NPM_SCRIPT", "Missing required validation script.", { scriptName });
    }
  }
}

if (findings.length > 0) {
  console.error("Client-Matter OS G6 plan validation failed:");
  for (const finding of findings) {
    console.error(`- ${finding.code}: ${finding.message}`);
    if (Object.keys(finding.details).length > 0) {
      console.error(`  ${JSON.stringify(finding.details)}`);
    }
  }
  process.exit(1);
}

console.log("Client-Matter OS G6 plan validation passed.");
console.log("g6_tuw_rows: 32/32");
console.log("analytics_scope: AnalyticsEvent/MatterProfitability/ClientProfitability/UtilizationMetric/RealizationMetric");
console.log("ai_scope: ModelPolicy/RetrievalRequest/PromptLog/AIOutput/Citation/HumanReview");
console.log("portal_scope: ExternalUser/PortalMatterProjection/ExternalACL/RFI/SecureLink/DataRoom");
console.log("g5_handoff_boundary: required_before_ai_portal_runtime");
console.log("g6_runtime_readiness_claim: open");
