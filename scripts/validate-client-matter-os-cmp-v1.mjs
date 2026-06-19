#!/usr/bin/env node
import { readFile } from "node:fs/promises";
import path from "node:path";
import process from "node:process";

const ROOT = path.resolve("docs/reorganization/client-matter-os");
const CMP_ROOT = path.join(ROOT, "cmp-v1");

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
  "cmp-v1-tuw-crosswalk.csv",
  "02-cmp-stable-implementation-plan.md"
]);

const REQUIRED_COLUMNS = Object.freeze([
  "CMP TUW",
  "기존 LFOS TUW",
  "status",
  "target package",
  "validator impact",
  "runtime claim allowed"
]);

const VALID_STATUSES = new Set(["same", "expanded", "new", "reordered", "supersedes"]);

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
    addFinding(findings, "MISSING_FILE", `Missing CMP v1 artifact: ${file}`);
  }
}

const sourceRegister = await readDoc(ROOT, "00-source-package-register.md");
const sourceIntake = await readDoc(CMP_ROOT, "00-cmp-source-intake.md");
const implementationPlan = await readDoc(CMP_ROOT, "02-cmp-stable-implementation-plan.md");
const csv = await readDoc(CMP_ROOT, "cmp-v1-tuw-crosswalk.csv");

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
  addFinding(findings, "CMP_TUW_COUNT", "CMP v1 crosswalk must preserve exactly 316 data rows.", {
    expected: 316,
    actual: rows.length
  });
}

const ids = rows.map((row) => row["CMP TUW"]);
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
  const gate = row["CMP TUW"]?.match(/^(CMP-G\d+)-/)?.[1] ?? "UNKNOWN";
  actualGateCounts[gate] = (actualGateCounts[gate] ?? 0) + 1;
  for (const column of REQUIRED_COLUMNS) {
    if (!row[column]) {
      addFinding(findings, "EMPTY_CELL", `CMP v1 crosswalk row ${row["CMP TUW"]} missing ${column}.`);
    }
  }
  if (!VALID_STATUSES.has(row.status)) {
    addFinding(findings, "STATUS_BOUNDARY", `CMP v1 row ${row["CMP TUW"]} has invalid status ${row.status}.`);
  }
  if (!row["validator impact"].includes("requires") && !row["validator impact"].includes("validates")) {
    addFinding(findings, "VALIDATOR_IMPACT", `CMP v1 row ${row["CMP TUW"]} must describe validator impact.`);
  }
  if (!row["runtime claim allowed"].includes("only after") && !row["runtime claim allowed"].startsWith("no ")) {
    addFinding(findings, "CLAIM_BOUNDARY", `CMP v1 row ${row["CMP TUW"]} must preserve runtime-claim permission.`);
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
  console.error("Client-Matter OS CMP v1 validation failed.");
  for (const finding of findings) {
    console.error(JSON.stringify(finding));
  }
  process.exit(1);
}

console.log("Client-Matter OS CMP v1 validation passed.");
console.log(`cmp_tuw_rows: ${rows.length}/316`);
console.log(
  `cmp_gate_counts: ${Object.entries(actualGateCounts)
    .map(([gate, count]) => `${gate}:${count}`)
    .join(" ")}`
);
console.log("runtime_claim_boundary: planning-only until row evidence proves R4 requirements");
console.log("cmp_v1_statuses: same/expanded/new/reordered/supersedes only");
