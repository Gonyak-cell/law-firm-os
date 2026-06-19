#!/usr/bin/env node
import { readFile } from "node:fs/promises";
import path from "node:path";
import process from "node:process";

const ROOT = path.resolve("docs/reorganization/client-matter-os");
const CMP_ROOT = path.join(ROOT, "cmp-extension");

const EXPECTED_GATE_COUNTS = Object.freeze({
  "CMP-G0": 21,
  "CMP-G1": 24,
  "CMP-G2": 19,
  "CMP-G3": 24,
  "CMP-G4": 23,
  "CMP-G5": 32,
  "CMP-G6": 22,
  "CMP-G7": 26,
  "CMP-G8": 14,
  "CMP-G9": 18,
  "CMP-G10": 17,
  "CMP-G11": 48,
  "CMP-G12": 28
});

const REQUIRED_FILES = Object.freeze([
  "README.md",
  "00-cmp-source-intake.md",
  "01-cmp-tuw-crosswalk.csv",
  "02-cmp-stable-implementation-plan.md"
]);

const REQUIRED_COLUMNS = Object.freeze([
  "cmp_tuw_id",
  "cmp_gate",
  "cmp_gate_name",
  "cmp_workstream",
  "cmp_task",
  "risk",
  "priority",
  "runtime_readiness_target",
  "integration_order",
  "implementation_batch",
  "repo_absorption_lane",
  "existing_lfos_anchor",
  "github_history_unit",
  "runtime_claim_rule",
  "status"
]);

function parseCsv(text) {
  const rows = [];
  let row = [];
  let field = "";
  let quoted = false;

  for (let i = 0; i < text.length; i += 1) {
    const char = text[i];
    const next = text[i + 1];

    if (quoted) {
      if (char === '"' && next === '"') {
        field += '"';
        i += 1;
      } else if (char === '"') {
        quoted = false;
      } else {
        field += char;
      }
      continue;
    }

    if (char === '"') {
      quoted = true;
    } else if (char === ",") {
      row.push(field);
      field = "";
    } else if (char === "\n") {
      row.push(field);
      rows.push(row);
      row = [];
      field = "";
    } else if (char !== "\r") {
      field += char;
    }
  }

  if (field.length > 0 || row.length > 0) {
    row.push(field);
    rows.push(row);
  }

  return rows.filter((entry) => entry.some((value) => value.length > 0));
}

function toObjects(csvRows) {
  const [header, ...data] = csvRows;
  return data.map((row) => Object.fromEntries(header.map((column, index) => [column, row[index] ?? ""])));
}

function addFinding(findings, code, message, details = {}) {
  findings.push({ code, message, details });
}

async function readDoc(...parts) {
  return readFile(path.join(...parts), "utf8");
}

const findings = [];

for (const file of REQUIRED_FILES) {
  try {
    await readDoc(CMP_ROOT, file);
  } catch {
    addFinding(findings, "MISSING_FILE", `Missing CMP extension artifact: ${file}`);
  }
}

const sourceRegister = await readDoc(ROOT, "00-source-package-register.md");
const sourceIntake = await readDoc(CMP_ROOT, "00-cmp-source-intake.md");
const implementationPlan = await readDoc(CMP_ROOT, "02-cmp-stable-implementation-plan.md");
const csv = await readDoc(CMP_ROOT, "01-cmp-tuw-crosswalk.csv");

if (!sourceRegister.includes("/Users/jws/Documents/Codex/Client-Matter-People/")) {
  addFinding(findings, "SOURCE_REGISTER", "Source package register must mention the Client-Matter-People source path.");
}

for (const required of [
  "316",
  "13",
  "CMP-G0-W00-T001",
  "CMP-G12-W12-T028",
  "b738a3dc15c2870067a402824d9d05c57b95a1f3e83e7f0b817989bf21bffd39"
]) {
  if (!sourceIntake.includes(required)) {
    addFinding(findings, "SOURCE_INTAKE", `CMP source intake missing required marker: ${required}`);
  }
}

const csvRows = parseCsv(csv);
const header = csvRows[0] ?? [];
for (const column of REQUIRED_COLUMNS) {
  if (!header.includes(column)) {
    addFinding(findings, "MISSING_COLUMN", `CMP crosswalk missing column: ${column}`);
  }
}

const rows = toObjects(csvRows);
if (rows.length !== 316) {
  addFinding(findings, "CMP_TUW_COUNT", "CMP crosswalk must preserve exactly 316 data rows.", {
    expected: 316,
    actual: rows.length
  });
}

const ids = rows.map((row) => row.cmp_tuw_id);
const uniqueIds = new Set(ids);
if (uniqueIds.size !== ids.length) {
  addFinding(findings, "DUPLICATE_TUW", "CMP crosswalk contains duplicate TUW IDs.", {
    duplicate_count: ids.length - uniqueIds.size
  });
}

if (ids[0] !== "CMP-G0-W00-T001") {
  addFinding(findings, "FIRST_TUW", "CMP crosswalk first TUW drift.", { actual: ids[0] });
}
if (ids.at(-1) !== "CMP-G12-W12-T028") {
  addFinding(findings, "LAST_TUW", "CMP crosswalk last TUW drift.", { actual: ids.at(-1) });
}

const actualGateCounts = Object.fromEntries(Object.keys(EXPECTED_GATE_COUNTS).map((gate) => [gate, 0]));
for (const row of rows) {
  actualGateCounts[row.cmp_gate] = (actualGateCounts[row.cmp_gate] ?? 0) + 1;
  for (const column of REQUIRED_COLUMNS) {
    if (!row[column]) {
      addFinding(findings, "EMPTY_CELL", `CMP crosswalk row ${row.cmp_tuw_id} missing ${column}.`);
    }
  }
  if (row.status !== "planned_extension") {
    addFinding(findings, "STATUS_BOUNDARY", `CMP row ${row.cmp_tuw_id} must remain planned_extension until implementation evidence exists.`);
  }
  if (!row.runtime_claim_rule.includes("planning-only")) {
    addFinding(findings, "CLAIM_BOUNDARY", `CMP row ${row.cmp_tuw_id} must preserve the planning-only runtime claim rule.`);
  }
  if (!row.github_history_unit.startsWith("branch codex/lawos-cmp-")) {
    addFinding(findings, "GITHUB_HISTORY_UNIT", `CMP row ${row.cmp_tuw_id} must name a codex/lawos-cmp branch unit.`);
  }
}

for (const [gate, expected] of Object.entries(EXPECTED_GATE_COUNTS)) {
  if (actualGateCounts[gate] !== expected) {
    addFinding(findings, "GATE_COUNT", `${gate} TUW count drift.`, {
      expected,
      actual: actualGateCounts[gate]
    });
  }
  if (!implementationPlan.includes(gate)) {
    addFinding(findings, "PLAN_GATE", `Implementation plan missing ${gate}.`);
  }
}

for (const batch of [
  "B00",
  "B01",
  "B02",
  "B03a",
  "B03b",
  "B04",
  "B05",
  "B06",
  "B07",
  "B08a",
  "B08b",
  "B08c",
  "B09",
  "B10"
]) {
  if (!implementationPlan.includes(batch)) {
    addFinding(findings, "PLAN_BATCH", `Implementation plan missing batch ${batch}.`);
  }
}

if (!implementationPlan.includes("Opportunity-to-Intake clearance")) {
  addFinding(findings, "DEPENDENCY_ORDER", "Implementation plan must preserve the CRM/Intake clearance dependency before Matter runtime claims.");
}
if (!implementationPlan.includes("permission-before-search")) {
  addFinding(findings, "PERMISSION_BEFORE_RETRIEVAL", "Implementation plan must preserve permission-before-search/AI/portal controls.");
}
if (!implementationPlan.includes("must not be described as runtime-write-ready")) {
  addFinding(findings, "NO_R4_WEAKENING", "Implementation plan must preserve the no-runtime-write-ready claim boundary.");
}

if (findings.length > 0) {
  console.error("Client-Matter OS CMP extension validation failed.");
  for (const finding of findings) {
    console.error(JSON.stringify(finding));
  }
  process.exit(1);
}

console.log("Client-Matter OS CMP extension validation passed.");
console.log(`cmp_tuw_rows: ${rows.length}/316`);
console.log(
  `cmp_gate_counts: ${Object.entries(actualGateCounts)
    .map(([gate, count]) => `${gate}:${count}`)
    .join(" ")}`
);
console.log("runtime_claim_boundary: planning-only until row evidence proves R4 requirements");
console.log("github_history_units: present for all CMP rows");
