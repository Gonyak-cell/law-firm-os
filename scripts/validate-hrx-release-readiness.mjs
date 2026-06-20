#!/usr/bin/env node
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";

const root = process.cwd();
const errors = [];

function read(path) {
  return readFileSync(resolve(root, path), "utf8");
}

function assert(condition, message) {
  if (!condition) errors.push(message);
}

function parseCsvLine(line) {
  const cells = [];
  let current = "";
  let quoted = false;
  for (let index = 0; index < line.length; index += 1) {
    const char = line[index];
    if (char === "\"") {
      if (quoted && line[index + 1] === "\"") {
        current += "\"";
        index += 1;
      } else {
        quoted = !quoted;
      }
    } else if (char === "," && !quoted) {
      cells.push(current);
      current = "";
    } else {
      current += char;
    }
  }
  cells.push(current);
  return cells;
}

function parseCsv(text) {
  const lines = text.replace(/^\uFEFF/, "").trim().split(/\r?\n/);
  const headers = parseCsvLine(lines[0]);
  return lines.slice(1).map((line) =>
    Object.fromEntries(parseCsvLine(line).map((value, index) => [headers[index], value])),
  );
}

const importedPackageFiles = [
  "docs/hrx-enterprise/roadmap-package/HRX_Roadmap_00_PACKAGE_README.md",
  "docs/hrx-enterprise/roadmap-package/HRX_Roadmap_01_MASTER_ROADMAP.md",
  "docs/hrx-enterprise/roadmap-package/02_PYRAMID_TOC.md",
  "docs/hrx-enterprise/roadmap-package/HRX_Roadmap_03_TUW_BACKLOG.csv",
  "docs/hrx-enterprise/roadmap-package/03_TUW_ISSUE_IMPORT.json",
  "docs/hrx-enterprise/roadmap-package/HRX_Roadmap_04_PR_SEQUENCE.md",
  "docs/hrx-enterprise/roadmap-package/05_ACCEPTANCE_GATES.md",
  "docs/hrx-enterprise/roadmap-package/HRX_Roadmap_06_VALIDATOR_TEST_PLAN.md",
  "docs/hrx-enterprise/roadmap-package/HRX_Roadmap_07_ARCHITECTURE_DATA_MODEL.md",
  "docs/hrx-enterprise/roadmap-package/HRX_Roadmap_08_RISK_REGISTER.md",
  "docs/hrx-enterprise/roadmap-package/HRX_Roadmap_09_30_60_90_PLAN.md",
  "docs/hrx-enterprise/roadmap-package/HRX_Roadmap_10_DEV_HANDOFF_CHECKLIST.md",
  "docs/hrx-enterprise/roadmap-package/11_DECISION_LOG_TEMPLATE.md",
  "docs/hrx-enterprise/roadmap-package/12_GO_NO_GO_TEMPLATE.md",
  "docs/hrx-enterprise/roadmap-package/package-manifest.json",
];

const topLevelFiles = [
  "docs/hrx-enterprise/00-boundary-decision.md",
  "docs/hrx-enterprise/01-terminology.md",
  "docs/hrx-enterprise/02-tuw-governance.md",
  "docs/hrx-enterprise/03-release-gates.md",
  "docs/hrx-enterprise/acceptance-gates.md",
  "docs/hrx-enterprise/plan-intake.md",
  "docs/hrx-enterprise/tuw-traceability-matrix.md",
  "docs/hrx-enterprise/tuw-status-ledger.json",
  "docs/hrx-enterprise/sequential-pack-pr-board.md",
  "docs/hrx-enterprise/risk-register.md",
  "docs/hrx-enterprise/dev-handoff-receipt.md",
  "docs/hrx-enterprise/owner-decision-template.md",
  "docs/hrx-enterprise/go-no-go-template.md",
  "docs/hrx-enterprise/go-live-checklist.md",
  "docs/hrx-enterprise/cutover-runbook.md",
  "docs/hrx-enterprise/production-readiness-evidence.md",
  "docs/hrx-enterprise/release-notes-template.md",
  "docs/hrx-enterprise/post-release-monitoring.md",
  "docs/hrx-enterprise/dev-handoff-closeout.md",
  "contracts/hrx-release-readiness.json",
];

for (const file of [...importedPackageFiles, ...topLevelFiles]) {
  assert(existsSync(resolve(root, file)), `${file}: missing`);
}

const packageManifest = existsSync(resolve(root, "docs/hrx-enterprise/roadmap-package/package-manifest.json"))
  ? JSON.parse(read("docs/hrx-enterprise/roadmap-package/package-manifest.json"))
  : null;
assert(packageManifest?.tuW_count === 127, "package manifest must report 127 TUWs");
assert(packageManifest?.p0_count === 63, "package manifest must report 63 P0 TUWs");
assert(packageManifest?.base_branch === "codex/lawos-current-work-snapshot", "package manifest base branch mismatch");

const backlogPath = "docs/hrx-enterprise/roadmap-package/HRX_Roadmap_03_TUW_BACKLOG.csv";
const rows = existsSync(resolve(root, backlogPath)) ? parseCsv(read(backlogPath)) : [];
assert(rows.length === 127, "roadmap backlog must contain 127 TUWs");
assert(rows.filter((row) => row.Severity === "P0").length === 63, "roadmap backlog must contain 63 P0 TUWs");
assert(rows.filter((row) => row.Severity === "P1").length === 64, "roadmap backlog must contain 64 P1 TUWs");
for (const row of rows) {
  for (const field of ["ID", "Layer", "Epic", "Task", "Severity", "Current status", "Target files", "Acceptance criteria", "Tests/commands", "Dependencies", "PR sequence", "Risk if skipped"]) {
    assert(Boolean(row[field]), `${row.ID || "unknown TUW"}: missing ${field}`);
  }
}

const traceability = existsSync(resolve(root, "docs/hrx-enterprise/tuw-traceability-matrix.md"))
  ? read("docs/hrx-enterprise/tuw-traceability-matrix.md")
  : "";
assert(traceability.includes("Imported TUWs: 127"), "traceability matrix must report 127 TUWs");
assert(traceability.includes("P0 TUWs: 63"), "traceability matrix must report 63 P0 TUWs");
assert(traceability.includes("P1 TUWs: 64"), "traceability matrix must report 64 P1 TUWs");
for (const id of ["HRX-L0-001", "HRX-L1-014", "HRX-L4-020", "HRX-L8-010"]) {
  assert(traceability.includes(id), `traceability matrix missing ${id}`);
}

const statusLedger = existsSync(resolve(root, "docs/hrx-enterprise/tuw-status-ledger.json"))
  ? JSON.parse(read("docs/hrx-enterprise/tuw-status-ledger.json"))
  : { entries: [] };
const statusById = new Map((statusLedger.entries ?? []).map((entry) => [entry.id, entry]));
for (const id of ["HRX-L0-001", "HRX-L0-002", "HRX-L0-003", "HRX-L0-004", "HRX-L0-005", "HRX-L0-006", "HRX-L0-007", "HRX-L0-008"]) {
  const entry = statusById.get(id);
  assert(entry?.status === "closed", `${id}: PR-00 status ledger must mark closed`);
  assert(entry?.pr === "PR-00", `${id}: PR-00 status ledger PR mismatch`);
  assert(Array.isArray(entry?.evidence) && entry.evidence.length > 0, `${id}: PR-00 status ledger evidence required`);
  assert(Array.isArray(entry?.validators) && entry.validators.length > 0, `${id}: PR-00 status ledger validators required`);
}
for (const id of ["HRX-L8-001", "HRX-L8-002", "HRX-L8-003", "HRX-L8-004", "HRX-L8-005", "HRX-L8-006", "HRX-L8-007", "HRX-L8-008", "HRX-L8-009", "HRX-L8-010"]) {
  const entry = statusById.get(id);
  assert(entry?.status === "closed", `${id}: PR-15 status ledger must mark closed`);
  assert(entry?.pr === "PR-15", `${id}: PR-15 status ledger PR mismatch`);
  assert(Array.isArray(entry?.evidence) && entry.evidence.length > 0, `${id}: PR-15 status ledger evidence required`);
  assert(Array.isArray(entry?.validators) && entry.validators.length > 0, `${id}: PR-15 status ledger validators required`);
}

const board = existsSync(resolve(root, "docs/hrx-enterprise/sequential-pack-pr-board.md"))
  ? read("docs/hrx-enterprise/sequential-pack-pr-board.md")
  : "";
for (const pr of ["PR-00", "PR-01", "PR-02", "PR-03", "PR-04", "PR-05", "PR-06", "PR-07", "PR-08", "PR-09", "PR-10", "PR-11", "PR-12", "PR-13", "PR-14", "PR-15"]) {
  assert(board.includes(pr), `sequential PR board missing ${pr}`);
}

const packageJson = existsSync(resolve(root, "package.json")) ? JSON.parse(read("package.json")) : {};
assert(packageJson.scripts?.["hrx:no-premature-claim:validate"] === "node scripts/validate-hrx-no-premature-claim.mjs", "package script hrx:no-premature-claim:validate missing");
assert(packageJson.scripts?.["hrx:release:validate"] === "node scripts/validate-hrx-release-readiness.mjs", "package script hrx:release:validate must run release readiness validator");
assert(packageJson.scripts?.["hrx:r4-claim:validate"] === "node scripts/validate-hrx-r4-claim.mjs", "package script hrx:r4-claim:validate missing");
assert(packageJson.scripts?.["hrx:launch-blockers:validate"] === "node scripts/validate-hrx-launch-blockers.mjs", "package script hrx:launch-blockers:validate missing");

const releaseContract = existsSync(resolve(root, "contracts/hrx-release-readiness.json"))
  ? JSON.parse(read("contracts/hrx-release-readiness.json"))
  : null;
assert(releaseContract?.required_gates?.length >= 9, "release contract must list required gates");
assert(releaseContract?.claim_policy?.owner_signoff_required === true, "release contract must require owner sign-off");
assert(releaseContract?.claim_policy?.go_live_claim_allowed === false, "release contract must keep go-live claim false");
assert(releaseContract?.claim_policy?.r4_claim_allowed === false, "release contract must keep R4 claim false");

if (errors.length > 0) {
  console.error("HRX release readiness validation failed:");
  for (const error of errors) console.error(`- ${error}`);
  process.exit(1);
}

console.log("HRX release readiness validation passed.");
console.log(`roadmap_tuw_count: ${rows.length}`);
console.log(`p0_count: ${rows.filter((row) => row.Severity === "P0").length}`);
console.log(`p1_count: ${rows.filter((row) => row.Severity === "P1").length}`);
