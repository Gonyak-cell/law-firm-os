#!/usr/bin/env node
import { readFile, stat } from "node:fs/promises";
import path from "node:path";
import process from "node:process";

const ROOT = path.resolve("docs/reorganization/client-matter-os");

const REQUIRED_FILES = [
  "README.md",
  "00-source-package-register.md",
  "01-current-folder-inventory.md",
  "02-package-inventory.md",
  "03-contract-inventory.md",
  "04-canonical-glossary.md",
  "05-canonical-object-ownership.md",
  "06-module-boundary.md",
  "07-runtime-readiness-standard.md",
  "08-migration-manifest.csv",
  "09-g0-closeout-report.md",
  "10-roadmap-and-gates.md",
  "11-full-tuw-catalog.md",
  "12-risk-register.md",
  "13-workflow-state-and-folder-checklist.md"
];

const EXPECTED_GATE_COUNTS = Object.freeze({
  G0: 10,
  G1: 16,
  G2: 14,
  G3: 26,
  G4: 30,
  G5: 30,
  G6: 32,
  G7: 40
});

const REQUIRED_CRITICAL_RISKS = [
  "R-001",
  "R-002",
  "R-003",
  "R-004",
  "R-005",
  "R-007",
  "R-010",
  "R-011"
];

const REQUIRED_CANONICAL_OBJECTS = [
  "Party",
  "Person",
  "Organization",
  "ClientGroup",
  "Relationship",
  "BillingProfile",
  "Opportunity",
  "IntakeRequest",
  "ConflictCheck",
  "Waiver",
  "Engagement",
  "Matter",
  "Document",
  "DocumentVersion",
  "TimeEntry",
  "WIP",
  "Invoice",
  "Payment",
  "ARBalance",
  "SettlementRun",
  "AuditEvent",
  "AIOutput",
  "ExternalUser",
  "Employee"
];

const REQUIRED_BADGES = ["R0", "R1", "R2", "R3", "R4", "R5", "R6"];

const REQUIRED_DECISION_ARTIFACTS = [
  {
    file: "14-billing-profile-ownership-adr.md",
    id: "ADR-G0-001",
    phrases: [
      "BillingProfile Canonical Ownership",
      "Party & Relationship Master",
      "Billing owns billing workflow state",
      "Human review still needs to accept or amend"
    ]
  },
  {
    file: "15-github-remote-vault-flow-adr.md",
    id: "ADR-G0-002",
    phrases: [
      "sanitized GitHub snapshot",
      "docs/weighted-implementation-ledger.json",
      "No local history rewrite",
      "Draft PRs",
      "No-self-merge",
      "codex/*"
    ]
  },
  {
    file: "16-planning-root-adr.md",
    id: "ADR-G0-003",
    phrases: [
      "Client-Matter OS Planning Root",
      "docs/reorganization/client-matter-os/",
      "canonical planning root",
      "Closeout-pack evidence remains separate",
      "does not make planning artifacts runtime evidence",
      "Human review still needs to accept or amend"
    ]
  },
  {
    file: "17-g1-g2-sequencing-adr.md",
    id: "ADR-G0-004",
    phrases: [
      "G1/G2 Sequencing",
      "separate Vault-style PR lanes",
      "runtime gate acceptance sequential",
      "G2 must not claim runtime write readiness",
      "Required G1 Evidence Before G2 Runtime Claim",
      "Human review still needs to accept or amend"
    ]
  }
];

function addFinding(findings, code, message, details = {}) {
  findings.push({ code, message, details });
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

function countRowsWithPrefix(markdown, heading, nextHeading, prefix) {
  return tableRows(markdown, heading, nextHeading).filter((line) => line.startsWith(`| ${prefix}`)).length;
}

async function readDoc(file) {
  return readFile(path.join(ROOT, file), "utf8");
}

async function exists(file) {
  try {
    await stat(path.join(ROOT, file));
    return true;
  } catch {
    return false;
  }
}

const findings = [];

for (const file of REQUIRED_FILES) {
  if (!(await exists(file))) {
    addFinding(findings, "MISSING_FILE", `Missing required Client-Matter OS artifact: ${file}`);
  }
}

const decisionDocs = new Map();
for (const artifact of REQUIRED_DECISION_ARTIFACTS) {
  if (!(await exists(artifact.file))) {
    addFinding(findings, "MISSING_DECISION_ARTIFACT", `Missing G0 decision artifact: ${artifact.file}`);
  } else {
    decisionDocs.set(artifact.file, await readDoc(artifact.file));
  }
}

if (findings.length === 0) {
  const source = await readDoc("00-source-package-register.md");
  const ownership = await readDoc("05-canonical-object-ownership.md");
  const boundary = await readDoc("06-module-boundary.md");
  const readiness = await readDoc("07-runtime-readiness-standard.md");
  const manifest = await readDoc("08-migration-manifest.csv");
  const closeout = await readDoc("09-g0-closeout-report.md");
  const roadmap = await readDoc("10-roadmap-and-gates.md");
  const tuw = await readDoc("11-full-tuw-catalog.md");
  const risks = await readDoc("12-risk-register.md");
  const workflow = await readDoc("13-workflow-state-and-folder-checklist.md");
  const readme = await readDoc("README.md");

  for (const gate of Object.keys(EXPECTED_GATE_COUNTS)) {
    if (!roadmap.includes(`| ${gate} |`)) {
      addFinding(findings, "MISSING_GATE", `Roadmap/gates artifact does not include ${gate}.`);
    }
  }

  const tuwRows = tableRows(tuw, "## TUW Rows", "## Use in Vault-Style PRs").filter((line) => line.startsWith("| LFOS-"));
  if (tuwRows.length !== 198) {
    addFinding(findings, "TUW_COUNT", "Full TUW catalog must preserve 198 TUW rows.", {
      expected: 198,
      actual: tuwRows.length
    });
  }

  for (const [gate, expected] of Object.entries(EXPECTED_GATE_COUNTS)) {
    const actual = tuwRows.filter((line) => line.includes(`| ${gate} |`)).length;
    if (actual !== expected) {
      addFinding(findings, "GATE_TUW_COUNT", `${gate} must preserve its source TUW count.`, {
        expected,
        actual
      });
    }
  }

  if (!source.includes("LFOS-G0-W00-T001") || !source.includes("LFOS-G7-W15-T012")) {
    addFinding(findings, "SOURCE_BOUNDARY_TUW", "Source register must preserve first and last TUW boundaries.");
  }

  for (const badge of REQUIRED_BADGES) {
    if (!readiness.includes(`| ${badge} |`)) {
      addFinding(findings, "MISSING_READINESS_BADGE", `Runtime readiness standard missing ${badge}.`);
    }
  }

  const riskRows = tableRows(risks, "These risks are control requirements.", "## Highest-Risk Defaults").filter((line) =>
    line.startsWith("| R-")
  );
  if (riskRows.length !== 15) {
    addFinding(findings, "RISK_COUNT", "Risk register must preserve 15 source risks.", {
      expected: 15,
      actual: riskRows.length
    });
  }
  for (const riskId of REQUIRED_CRITICAL_RISKS) {
    if (!risks.includes(`| ${riskId} |`)) {
      addFinding(findings, "MISSING_CRITICAL_RISK", `Risk register missing ${riskId}.`);
    }
  }

  for (const objectName of REQUIRED_CANONICAL_OBJECTS) {
    if (!ownership.includes(`| ${objectName} |`)) {
      addFinding(findings, "MISSING_CANONICAL_OBJECT", `Ownership matrix missing ${objectName}.`);
    }
  }

  const workflowRows = countRowsWithPrefix(workflow, "## End-to-End Workflow", "## State Machines", "");
  if (workflowRows < 14) {
    addFinding(findings, "WORKFLOW_ROWS", "Workflow checklist must preserve at least 14 source workflow rows.", {
      expected_minimum: 14,
      actual: workflowRows
    });
  }

  const stateRows = tableRows(workflow, "## State Machines", "## Folder Checklist").filter((line) => !line.startsWith("| 객체 |"));
  if (stateRows.length !== 12) {
    addFinding(findings, "STATE_MACHINE_ROWS", "State-machine checklist must preserve 12 source state rows.", {
      expected: 12,
      actual: stateRows.length
    });
  }

  const folderRows = tableRows(workflow, "## Folder Checklist", "## Prohibited Shortcut").filter((line) => line.includes("README.md"));
  if (folderRows.length !== 15) {
    addFinding(findings, "FOLDER_CHECKLIST_ROWS", "Folder checklist must preserve 15 target folder rows.", {
      expected: 15,
      actual: folderRows.length
    });
  }

  const prohibitedShortcut = "Opportunity cannot become Matter directly";
  if (!workflow.includes(prohibitedShortcut) || !boundary.includes("Opportunity -> Matter") || !boundary.includes("prohibited")) {
    addFinding(findings, "OPPORTUNITY_MATTER_SHORTCUT", "Artifacts must explicitly prohibit direct Opportunity-to-Matter conversion.");
  }

  if (!readme.includes("Vault-Style PR Rules") || !readme.includes("Do not merge the PR from the agent side")) {
    addFinding(findings, "VAULT_PR_RULES", "README must preserve Vault-style PR rules and no-self-merge boundary.");
  }

  if (!readme.includes("Current Planning Root") || !readme.includes("Closeout-pack evidence")) {
    addFinding(findings, "PLANNING_ROOT_BOUNDARY", "README must document the Client-Matter OS planning root boundary.");
  }

  if (!readme.includes("sanitized snapshot") || !manifest.includes("docs/weighted-implementation-ledger.json")) {
    addFinding(findings, "SANITIZED_REMOTE_BOUNDARY", "Artifacts must document the sanitized GitHub snapshot boundary.");
  }

  for (const artifact of REQUIRED_DECISION_ARTIFACTS) {
    const content = decisionDocs.get(artifact.file);
    if (!readme.includes(artifact.file) || !closeout.includes(artifact.id)) {
      addFinding(findings, "DECISION_ARTIFACT_NOT_INDEXED", `${artifact.id} must be indexed by README and G0 closeout.`, {
        file: artifact.file
      });
    }
    if (!content.includes(artifact.id) || !content.includes("Status: Proposed")) {
      addFinding(findings, "DECISION_ARTIFACT_METADATA", `${artifact.file} must preserve ADR id and proposed status.`, {
        id: artifact.id
      });
    }
    for (const phrase of artifact.phrases) {
      if (!content.includes(phrase)) {
        addFinding(findings, "DECISION_ARTIFACT_CONTENT", `${artifact.file} missing required decision phrase.`, {
          phrase
        });
      }
    }
  }

  if (!closeout.includes("PM/Tech Lead approval | Pending")) {
    addFinding(findings, "G0_APPROVAL_PENDING", "G0 closeout must keep PM/Tech Lead approval pending.");
  }

  if (!closeout.includes("does not claim runtime write readiness")) {
    addFinding(findings, "NO_RUNTIME_CLAIM", "G0 closeout must avoid runtime/enterprise/production completion claims.");
  }
}

if (findings.length > 0) {
  console.error("Client-Matter OS reorganization validation failed:");
  for (const finding of findings) {
    console.error(`- ${finding.code}: ${finding.message}`);
    if (Object.keys(finding.details).length > 0) {
      console.error(`  ${JSON.stringify(finding.details)}`);
    }
  }
  process.exit(1);
}

console.log("Client-Matter OS reorganization validation passed.");
console.log(`required_files: ${REQUIRED_FILES.length}/${REQUIRED_FILES.length}`);
console.log("gates: 8/8");
console.log("tuw_rows: 198/198");
console.log("risk_rows: 15/15");
console.log("readiness_badges: R0-R6");
console.log(`decision_artifacts: ${REQUIRED_DECISION_ARTIFACTS.length}/${REQUIRED_DECISION_ARTIFACTS.length}`);
console.log("vault_pr_boundary: preserved");
