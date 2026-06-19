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
  "55-g6-g-portal-data-room-closeout-report.md",
  "56-g7-enterprise-hardening-entry-plan.md",
];

const REQUIRED_REPO_SURFACES = [
  "contracts/admin-console-contract.json",
  "contracts/external-integrations-i-contract.json",
  "contracts/external-integrations-ii-contract.json",
  "contracts/migration-platform-contract.json",
  "contracts/enterprise-saas-hardening-contract.json",
  "contracts/platform-extensibility-contract.json",
  "contracts/marketplace-custom-ai-apps-contract.json",
  "contracts/commercial-readiness-contract.json",
  "contracts/hrx-people-contract.json",
  "packages/admin/README.md",
  "packages/integrations-core/README.md",
  "packages/finance-integrations/README.md",
  "packages/migration/README.md",
  "packages/enterprise/README.md",
  "packages/platform/README.md",
  "packages/marketplace/README.md",
  "packages/commercial/README.md",
  "packages/hrx/README.md",
  "scripts/validate-rp21-admin-console-contract.mjs",
  "scripts/validate-rp22-external-integrations-i-contract.mjs",
  "scripts/validate-rp23-external-integrations-ii-contract.mjs",
  "scripts/validate-rp25-migration-platform-contract.mjs",
  "scripts/validate-rp26-enterprise-saas-hardening-contract.mjs",
  "scripts/validate-rp27-platform-extensibility-contract.mjs",
  "scripts/validate-rp28-marketplace-custom-ai-apps-contract.mjs",
  "scripts/validate-rp29-commercial-readiness-contract.mjs",
  "scripts/validate-rp30-hrx-people-contract.mjs",
  "scripts/validate-go-live-readiness.mjs",
];

const REQUIRED_PLAN_PHRASES = [
  "G7 Enterprise Hardening UAT Production Readiness Entry Plan",
  "This plan opens G7 planning only",
  "does not claim G7 runtime readiness",
  "This plan does not approve go-live",
  "Local validation does not claim enterprise trust",
  "G7 can only close after the stacked G1 through G6 PR evidence is accepted",
  "Runtime Evidence Still Required",
  "PR Slice Plan",
  "G7 must not claim enterprise readiness, UAT completion, security approval, production readiness, customer launch readiness, or go-live approval",
];

const REQUIRED_SCOPE_MARKERS = [
  "tenant admin settings",
  "plan/usage model",
  "observability baseline",
  "incident runbook model",
  "release candidate model",
  "deployment run record",
  "compliance report generator",
  "admin audit viewer",
  "operations dashboard",
  "G7 Ops closeout",
  "User/Employee separation spec",
  "Employee schema",
  "capacity profile",
  "workload read model",
  "HR document guardrail",
  "evaluation access control",
  "candidate data separation",
  "HRX closeout",
  "connector registry",
  "credential reference model",
  "sync job model",
  "sync cursor model",
  "reconciliation run",
  "migration batch model",
  "import validation framework",
  "accounting connector export",
  "migration dashboard",
  "migration closeout",
  "test strategy",
  "unit test baseline",
  "integration test baseline",
  "permission negative tests",
  "audit completeness tests",
  "idempotency tests",
  "state transition tests",
  "security regression suite",
  "performance smoke",
  "backup/restore drill",
  "UAT script package",
  "production readiness review",
];

const REQUIRED_BRANCHES = [
  "codex/lawos-g7-admin-ops-foundation",
  "codex/lawos-g7-ops-commercial-closeout",
  "codex/lawos-g7-hrx-people-guardrails",
  "codex/lawos-g7-integrations-migration-foundation",
  "codex/lawos-g7-migration-cutover-closeout",
  "codex/lawos-g7-qa-security-baseline",
  "codex/lawos-g7-release-readiness-closeout",
];

const REQUIRED_PACKAGE_SCRIPTS = [
  "client-matter:g6g:validate",
  "client-matter:g7:plan:validate",
  "rp21:admin-console:validate",
  "rp22:external-integrations-i:validate",
  "rp23:external-integrations-ii:validate",
  "rp25:migration-platform:validate",
  "rp26:enterprise-saas:validate",
  "rp27:platform-extensibility:validate",
  "rp28:marketplace:validate",
  "rp29:commercial:validate",
  "rp30:hrx:validate",
  "validate",
];

const CONTRACT_PROGRAMS = [
  ["contracts/admin-console-contract.json", "RP21"],
  ["contracts/external-integrations-i-contract.json", "RP22"],
  ["contracts/external-integrations-ii-contract.json", "RP23"],
  ["contracts/migration-platform-contract.json", "RP25"],
  ["contracts/enterprise-saas-hardening-contract.json", "RP26"],
  ["contracts/platform-extensibility-contract.json", "RP27"],
  ["contracts/marketplace-custom-ai-apps-contract.json", "RP28"],
  ["contracts/commercial-readiness-contract.json", "RP29"],
  ["contracts/hrx-people-contract.json", "RP30"],
];

const EXPECTED_WEEK_COUNTS = Object.freeze({
  W12: 10,
  W13: 8,
  W14: 10,
  W15: 12,
});

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

function normalized(text) {
  return text.replace(/\s+/g, " ").trim();
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

function hasKeyValue(value, key, expected) {
  if (!value || typeof value !== "object") return false;
  if (value[key] === expected) return true;
  return Object.values(value).some((child) => hasKeyValue(child, key, expected));
}

const findings = [];

for (const file of REQUIRED_FILES) {
  const filePath = path.join(ROOT, file);
  if (!(await exists(filePath))) {
    addFinding(findings, "MISSING_FILE", `Missing G7 planning dependency: ${file}`);
  }
}

for (const file of REQUIRED_REPO_SURFACES) {
  if (!(await exists(path.resolve(file)))) {
    addFinding(findings, "MISSING_REPO_SURFACE", `Missing G7 repo evidence surface: ${file}`);
  }
}

if (findings.length === 0) {
  const roadmap = await readText(path.join(ROOT, "10-roadmap-and-gates.md"));
  const tuw = await readText(path.join(ROOT, "11-full-tuw-catalog.md"));
  const risks = await readText(path.join(ROOT, "12-risk-register.md"));
  const workflow = await readText(path.join(ROOT, "13-workflow-state-and-folder-checklist.md"));
  const g6Closeout = await readText(path.join(ROOT, "55-g6-g-portal-data-room-closeout-report.md"));
  const plan = await readText(path.join(ROOT, "56-g7-enterprise-hardening-entry-plan.md"));
  const pkg = await readJson(path.resolve("package.json"));
  const normalizedPlan = normalized(plan);

  for (const phrase of REQUIRED_PLAN_PHRASES) {
    if (!normalizedPlan.includes(normalized(phrase))) {
      addFinding(findings, "MISSING_PLAN_PHRASE", "G7 plan missing required boundary phrase.", { phrase });
    }
  }

  if (!roadmap.includes("G7") || !roadmap.includes("Enterprise Hardening Gate")) {
    addFinding(findings, "MISSING_ROADMAP_GATE", "Roadmap must preserve the G7 Enterprise Hardening Gate.");
  }

  for (const marker of ["12 Admin / Operations / Commercial Readiness", "13 HRX People Module", "14 External Integrations / Migration"]) {
    if (!workflow.includes(marker)) {
      addFinding(findings, "MISSING_G7_WORKFLOW", "Workflow checklist must preserve G7 workflow marker.", { marker });
    }
  }

  if (
    !g6Closeout.includes("G6-G Portal Data Room Closeout Report") ||
    !g6Closeout.toLowerCase().includes("no internal data exposure")
  ) {
    addFinding(findings, "G6_HANDOFF_EVIDENCE", "G7 plan must depend on G6-G portal/data-room closeout evidence.");
  }

  const g7Rows = tableRows(tuw, "## TUW Rows", "## Use in Vault-Style PRs").filter((line) => line.startsWith("| LFOS-G7-"));
  if (g7Rows.length !== 40) {
    addFinding(findings, "G7_TUW_COUNT", "G7 TUW catalog must preserve 40 G7 rows.", {
      expected: 40,
      actual: g7Rows.length,
    });
  }

  for (const [week, expected] of Object.entries(EXPECTED_WEEK_COUNTS)) {
    const actual = g7Rows.filter((line) => line.includes(`LFOS-G7-${week}-`)).length;
    if (actual !== expected) {
      addFinding(findings, "G7_WEEK_COUNT", "G7 week TUW count drift.", { week, expected, actual });
    }
  }

  for (const [week, count] of Object.entries(EXPECTED_WEEK_COUNTS)) {
    for (let index = 1; index <= count; index += 1) {
      const tuwId = `LFOS-G7-${week}-T${String(index).padStart(3, "0")}`;
      if (!plan.includes(tuwId) || !tuw.includes(tuwId)) {
        addFinding(findings, "MISSING_G7_TUW", "G7 plan and catalog must both include every G7 TUW.", { tuwId });
      }
    }
  }

  for (const marker of REQUIRED_SCOPE_MARKERS) {
    if (!plan.includes(marker)) {
      addFinding(findings, "G7_SCOPE_MARKER", "G7 plan must include expected scope marker.", { marker });
    }
  }

  for (const branch of REQUIRED_BRANCHES) {
    if (!plan.includes(branch)) {
      addFinding(findings, "G7_BRANCH_MARKER", "G7 plan must include target stacked branch marker.", { branch });
    }
  }

  for (const [contractPath, programId] of CONTRACT_PROGRAMS) {
    const contract = await readJson(path.resolve(contractPath));
    if (!hasKeyValue(contract, "program_id", programId)) {
      addFinding(findings, "G7_CONTRACT_PROGRAM", "G7 source contract program id drift.", { contractPath, programId });
    }
    if (!hasKeyValue(contract, "descriptor_only", true)) {
      addFinding(findings, "G7_CONTRACT_DESCRIPTOR", "G7 source contract must remain descriptor-only entry evidence.", {
        contractPath,
      });
    }
    if (
      !hasKeyValue(contract, "writes_product_state", false) &&
      !hasKeyValue(contract, "record_write_opened", false) &&
      !hasKeyValue(contract, "runtime_execution", false)
    ) {
      addFinding(findings, "G7_CONTRACT_NO_WRITE", "G7 source contract must preserve no product-state write evidence.", {
        contractPath,
      });
    }
  }

  for (const readmePath of [
    "packages/admin/README.md",
    "packages/integrations-core/README.md",
    "packages/finance-integrations/README.md",
    "packages/migration/README.md",
    "packages/enterprise/README.md",
    "packages/platform/README.md",
    "packages/marketplace/README.md",
    "packages/commercial/README.md",
    "packages/hrx/README.md",
  ]) {
    const readme = (await readText(path.resolve(readmePath))).toLowerCase();
    if (!readme.includes("descriptor-only") && !readme.includes("descriptor only")) {
      addFinding(findings, "G7_README_BOUNDARY", "G7 README missing descriptor-only boundary marker.", { readmePath });
    }
    const hasClosedRuntimeLanguage =
      readme.includes("runtime") &&
      (readme.includes("closed") || readme.includes("without") || readme.includes("does not") || readme.includes("no-write"));
    const hasNoWriteExecutionLanguage = readme.includes("no-write") && readme.includes("does not execute");
    if (!hasClosedRuntimeLanguage && !hasNoWriteExecutionLanguage) {
      addFinding(findings, "G7_README_RUNTIME_BOUNDARY", "G7 README must preserve runtime-closed boundary language.", { readmePath });
    }
  }

  for (const riskMarker of ["Descriptor를 runtime으로 오인", "External portal overexposure", "AI가 DMS 권한 우회"]) {
    if (!risks.includes(riskMarker)) {
      addFinding(findings, "G7_RISK_MARKER", "Risk register missing inherited G7 negative-evidence marker.", {
        riskMarker,
      });
    }
  }

  const scripts = pkg.scripts ?? {};
  for (const scriptName of REQUIRED_PACKAGE_SCRIPTS) {
    if (!scripts[scriptName]) {
      addFinding(findings, "MISSING_PACKAGE_SCRIPT", "package.json missing G7 plan validation dependency script.", {
        scriptName,
      });
    }
  }
}

if (findings.length > 0) {
  console.error("G7 plan validation failed.");
  console.error(JSON.stringify({ valid: false, findings }, null, 2));
  process.exitCode = 1;
} else {
  console.log("G7 plan validation passed.");
  console.log(
    JSON.stringify(
      {
        valid: true,
        gate: "G7 Enterprise Hardening Gate",
        tuw_count: 40,
        week_counts: EXPECTED_WEEK_COUNTS,
        runtime_readiness_claim: "open",
        go_live_approval_claimed: false,
        enterprise_trust_claimed_from_local_validation: false,
      },
      null,
      2,
    ),
  );
}
