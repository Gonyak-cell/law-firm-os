#!/usr/bin/env node
import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import path from "node:path";

const ROOT = process.cwd();
const CMP_ROOT = path.join(ROOT, "docs/reorganization/client-matter-os/cmp-v1");

const REQUIRED_FILES = [
  "README.md",
  "00-cmp-source-intake.md",
  "cmp-v1-tuw-crosswalk.csv",
  "cmp-v1-tuw-crosswalk.json",
  "package-manifest.json",
  "glossary.md",
  "object-ownership.md",
  "module-boundaries.md",
  "runtime-readiness-standard.md",
  "target-folder-map.md",
  "pr-policy.md",
  "migration-manifest.csv",
  "api-standard.md",
  "event-taxonomy.md",
  "state-machines.md",
  "permission-model.md",
  "adr-vault-runtime.md",
  "adr-user-employee.md",
  "adr-billing-profile-owner.md",
  "current-state-report.md",
  "roadmap-calendar.md",
  "g0-closeout.md",
];

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
  "CMP-G12": 28,
});

const EXPECTED_PRIORITY_COUNTS = Object.freeze({ P0: 88, P1: 139, P2: 89 });
const errors = [];

function add(message) {
  errors.push(message);
}

function rel(file) {
  return path.join(CMP_ROOT, file);
}

function readJson(file) {
  return JSON.parse(readFileSync(rel(file), "utf8"));
}

function readText(file) {
  return readFileSync(rel(file), "utf8");
}

function listFiles(dir) {
  const out = [];
  for (const name of readdirSync(dir)) {
    const full = path.join(dir, name);
    const stat = statSync(full);
    if (stat.isDirectory()) out.push(...listFiles(full));
    else out.push(full);
  }
  return out;
}

if (!existsSync(CMP_ROOT)) add(`missing CMP root: ${CMP_ROOT}`);

if (errors.length === 0) {
  for (const file of REQUIRED_FILES) {
    if (!existsSync(rel(file))) add(`missing required CMP v1 artifact: ${file}`);
  }
}

if (errors.length === 0) {
  const manifest = readJson("package-manifest.json");
  const crosswalk = readJson("cmp-v1-tuw-crosswalk.json");
  const source = readText("00-cmp-source-intake.md");
  const readiness = readText("runtime-readiness-standard.md");
  const roadmap = readText("roadmap-calendar.md");
  const closeout = readText("g0-closeout.md");
  const prPolicy = readText("pr-policy.md");
  const pkg = JSON.parse(readFileSync(path.join(ROOT, "package.json"), "utf8"));
  const prTemplatePath = path.join(ROOT, ".github/pull_request_template.md");
  const prTemplate = existsSync(prTemplatePath) ? readFileSync(prTemplatePath, "utf8") : "";

  if (manifest.total_tuws !== 316) add(`package-manifest total_tuws must be 316, got ${manifest.total_tuws}`);
  if (manifest.current_completion_claim !== "not_r4_ready") {
    add("package-manifest current_completion_claim must be not_r4_ready");
  }
  if (manifest.production_ready_claim !== false || manifest.go_live_claim !== false) {
    add("package-manifest must keep production/go-live claims false");
  }

  if (crosswalk.length !== 316) add(`crosswalk must contain 316 rows, got ${crosswalk.length}`);
  const uniqueIds = new Set(crosswalk.map((row) => row.tuw_id));
  if (uniqueIds.size !== crosswalk.length) add("crosswalk contains duplicate tuw_id values");
  for (const [gate, expected] of Object.entries(EXPECTED_GATE_COUNTS)) {
    const actual = crosswalk.filter((row) => row.gate === gate).length;
    if (actual !== expected) add(`${gate} count must be ${expected}, got ${actual}`);
  }
  for (const [priority, expected] of Object.entries(EXPECTED_PRIORITY_COUNTS)) {
    const actual = crosswalk.filter((row) => row.priority === priority).length;
    if (actual !== expected) add(`${priority} count must be ${expected}, got ${actual}`);
  }
  for (const row of crosswalk) {
    if (!row.evidence_path?.startsWith("docs/reorganization/client-matter-os/cmp-v1/evidence/")) {
      add(`${row.tuw_id}: evidence path must live under cmp-v1/evidence`);
    }
    if (row.implementation_gate !== "not_closed") {
      add(`${row.tuw_id}: implementation_gate must remain not_closed during intake`);
    }
    if (/complete|done/i.test(row.repo_status ?? "")) {
      add(`${row.tuw_id}: repo_status must not claim completion during intake`);
    }
  }

  for (const row of crosswalk) {
    const evidenceFile = path.join(ROOT, row.evidence_path);
    if (!existsSync(evidenceFile)) add(`${row.tuw_id}: missing evidence file ${row.evidence_path}`);
  }

  for (const phrase of [
    "Total TUWs | 316",
    "CMP_R4_Developer_Roadmap_Package_v1.0.zip",
    "SHA-256",
    "This intake records the package and crosswalk only",
  ]) {
    if (!source.includes(phrase)) add(`source intake missing phrase: ${phrase}`);
  }

  for (const phrase of [
    "R4 requires all of these together",
    "durable persistence",
    "write API",
    "permission",
    "audit",
    "state/idempotency",
  ]) {
    if (!readiness.includes(phrase)) add(`readiness standard missing phrase: ${phrase}`);
  }

  if (!roadmap.includes("Corrected Execution Order") || !roadmap.includes("CMP-G6 before any G4 R4 completion claim")) {
    add("roadmap calendar must record the CMP-G6 before CMP-G4 dependency correction");
  }

  for (const role of ["PM", "Tech Lead", "QA", "Security"]) {
    if (!closeout.includes(`| ${role} |`)) add(`G0 closeout missing approval row for ${role}`);
  }

  for (const phrase of ["CMP TUW IDs", "Evidence path", "G6 CRM/Intake clearance", "Production-ready and go-live"]) {
    if (!prPolicy.includes(phrase)) add(`PR policy missing phrase: ${phrase}`);
  }

  for (const [scriptName, scriptCmd] of Object.entries({
    "client-matter:cmp-v1:generate": "node scripts/generate-cmp-r4-intake.mjs",
    "client-matter:cmp-v1:validate": "node scripts/validate-client-matter-os-cmp-v1.mjs",
    "client-matter:cmp-v1:g1:validate": "node scripts/validate-cmp-r4-g1.mjs",
    "client-matter:cmp-v1:blockers": "node scripts/audit-cmp-r4-blockers.mjs",
    "client-matter:cmp-v1:blockers:baseline": "node scripts/audit-cmp-r4-blockers.mjs --baseline",
  })) {
    if (pkg.scripts?.[scriptName] !== scriptCmd) add(`package.json scripts.${scriptName} must equal ${scriptCmd}`);
  }

  for (const phrase of ["CMP-R4 Boundary Check", "CMP TUW IDs", "R4 runtime-write-ready"]) {
    if (!prTemplate.includes(phrase)) add(`pull_request_template missing phrase: ${phrase}`);
  }

  const generatedFiles = listFiles(CMP_ROOT);
  const forbiddenClaims = [
    /current state\s*:\s*R4 runtime-write-ready/i,
    /production_ready\s*[:=]\s*true/i,
    /go-live\s+approved/i,
    /status\s*:\s*CMP R4\s+complete/i,
    /status\s*:\s*R5\/R6\s+complete/i,
  ];
  for (const file of generatedFiles) {
    const text = readFileSync(file, "utf8");
    for (const pattern of forbiddenClaims) {
      if (pattern.test(text)) add(`${path.relative(ROOT, file)} contains forbidden completion claim ${pattern}`);
    }
  }
}

if (errors.length > 0) {
  console.error("CMP v1 validation failed:");
  for (const error of errors) console.error(`- ${error}`);
  process.exit(1);
}

console.log("CMP v1 validation passed.");
console.log("tuws: 316");
console.log(`gates: ${Object.keys(EXPECTED_GATE_COUNTS).length}`);
console.log("claim_boundary: not_r4_ready");
