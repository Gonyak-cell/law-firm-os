#!/usr/bin/env node
import assert from "node:assert/strict";
import {
  KOREA_SAAS_FIT_VALIDATION_MD_PATH,
  KOREA_SAAS_FIT_VALIDATION_PATH,
  KOREA_SAAS_IMPLEMENTATION_PLAN_PATH,
  KOREA_SAAS_RESEARCH_MATRIX_PATH,
  NO_UNIMPLEMENTED_PLAN_PATH,
  OPENABLE_PLAN_PATH,
  OPENABLE_TRACEABILITY_PATH,
  markdownTable,
  readJson,
  readText,
  writeJson,
  writeText
} from "./lcx-full-helpers.mjs";

const REQUIRED_SOURCE_IDS = Array.from({ length: 22 }, (_, index) => `S${String(index + 1).padStart(2, "0")}`);
const REQUIRED_KSOF_WAVES = Array.from({ length: 10 }, (_, index) => `KSOF-${String(index).padStart(2, "0")}`);
const REQUIRED_OPERATING_GATES = [
  "Data/read model",
  "Workflow/request",
  "Bulk/import safety",
  "Permission/audit",
  "Provider preflight",
  "Korean business nouns",
  "Evidence",
  "Law-firm triad"
];
const REQUIRED_FEATURE_TERMS = [
  "approval/request",
  "import safety",
  "status readback",
  "permission",
  "audit",
  "provider preflight",
  "bulk/error handling",
  "Korean business terminology",
  "saas_baseline_source_ids",
  "operating_features_required",
  "repo_completion_state",
  "residual_external_gate",
  "korea_saas_fit_missing"
];

function requireIncludes(text, needle, label) {
  assert.equal(text.includes(needle), true, `${label} missing ${needle}`);
}

function section(source, start, end) {
  const startIndex = source.indexOf(start);
  assert.notEqual(startIndex, -1, `missing section ${start}`);
  const endIndex = end ? source.indexOf(end, startIndex + start.length) : -1;
  return source.slice(startIndex, endIndex === -1 ? undefined : endIndex);
}

function parseMatrixRows(research) {
  return section(research, "## UI Research Matrix", "## Research Gaps")
    .split("\n")
    .filter((line) => line.startsWith("|") && !line.includes("---") && !line.includes("Law Firm OS UI"))
    .map((line) => line.split("|").slice(1, -1).map((cell) => cell.trim()))
    .filter((cells) => cells.length >= 4)
    .map((cells) => ({
      ui: cells[0],
      baseline: cells[1],
      capability: cells[2],
      exit_state: cells[3],
      source_ids: [...new Set(cells.join(" ").match(/S\d{2}/g) ?? [])].sort()
    }));
}

const packageJson = readJson("package.json");
assert.equal(packageJson.scripts?.["lcx:full:korea-saas-fit:validate"], "node scripts/validate-lcx-full-korea-saas-fit.mjs");

const research = readText(KOREA_SAAS_RESEARCH_MATRIX_PATH);
const implementationPlan = readText(KOREA_SAAS_IMPLEMENTATION_PLAN_PATH);
const openablePlan = readText(OPENABLE_PLAN_PATH);
const openableTraceability = readText(OPENABLE_TRACEABILITY_PATH);
const noUnimplementedPlan = readText(NO_UNIMPLEMENTED_PLAN_PATH);
const corpus = [research, implementationPlan, openablePlan, openableTraceability, noUnimplementedPlan].join("\n");

for (const sourceId of REQUIRED_SOURCE_IDS) {
  assert.match(research, new RegExp(`\\| ${sourceId} \\|`), `${sourceId} must be present in Official Source Map`);
}
for (const wave of REQUIRED_KSOF_WAVES) requireIncludes(implementationPlan, wave, "Korea SaaS wave plan");
for (const gate of REQUIRED_OPERATING_GATES) requireIncludes(research, gate, "Common Operating-Fit Gates");
for (const term of REQUIRED_FEATURE_TERMS) requireIncludes(corpus, term, "Korea SaaS operating-fit corpus");

requireIncludes(research, "Official Source Map", "research matrix");
requireIncludes(research, "UI Research Matrix", "research matrix");
requireIncludes(research, "Lazyweb report:", "research matrix");
requireIncludes(openableTraceability, "Every row also closes against the Korean SaaS operating guarantee", "openable traceability");
requireIncludes(noUnimplementedPlan, "Korean SaaS operating-fit failures are classified as `korea_saas_fit_missing`", "no-unimplemented plan");

const sourceRows = research.match(/^\| S\d{2} \|/gm) ?? [];
assert.equal(sourceRows.length, REQUIRED_SOURCE_IDS.length, "Official Source Map must cover S01..S22 exactly once");

const matrixRows = parseMatrixRows(research);
assert.ok(matrixRows.length >= 20, "UI Research Matrix must cover current openable UI surfaces");
for (const row of matrixRows) {
  assert.ok(row.source_ids.length > 0, `${row.ui} must cite at least one official source id`);
  assert.ok(row.exit_state.length > 0, `${row.ui} must define an exit state`);
  assert.ok(!/decorative|static only/i.test(row.capability), `${row.ui} capability must not be decorative/static-only`);
}

const report = {
  schema_version: "law-firm-os.lazycodex.lcx_full.korea_saas_fit_validation.v0.1",
  generated_at: new Date().toISOString(),
  verdict: "PASS",
  source_refs: [
    KOREA_SAAS_RESEARCH_MATRIX_PATH,
    KOREA_SAAS_IMPLEMENTATION_PLAN_PATH,
    OPENABLE_PLAN_PATH,
    OPENABLE_TRACEABILITY_PATH,
    NO_UNIMPLEMENTED_PLAN_PATH
  ],
  axis_b_korea_saas_operating_fit: {
    official_source_ids: REQUIRED_SOURCE_IDS,
    official_source_count: sourceRows.length,
    matrix_row_count: matrixRows.length,
    common_gate_count: REQUIRED_OPERATING_GATES.length,
    failure_status: "korea_saas_fit_missing"
  },
  matrix_summary: matrixRows.map((row) => ({
    ui: row.ui,
    source_ids: row.source_ids,
    exit_state: row.exit_state
  })),
  boundary: {
    provider_schema_current_claim: false,
    provider_production_connection_claim: false,
    external_send_claim: false,
    payment_movement_claim: false,
    tax_invoice_issue_claim: false,
    payroll_disbursement_claim: false,
    production_go_live_claim: false,
    public_release_claim: false
  }
};

writeJson(KOREA_SAAS_FIT_VALIDATION_PATH, report);
writeText(
  KOREA_SAAS_FIT_VALIDATION_MD_PATH,
  [
    "# LCX-FULL-21 Korea SaaS Fit Validation",
    "",
    `Generated at: ${report.generated_at}`,
    "",
    `Verdict: ${report.verdict}`,
    "",
    markdownTable(
      matrixRows.map((row) => ({
        UI: row.ui,
        Sources: row.source_ids.join(", "),
        "Exit state": row.exit_state
      })),
      ["UI", "Sources", "Exit state"]
    ),
    "",
    "Boundary: this validator checks official-source-backed Korean SaaS operating-fit conditions; it does not claim provider schema freshness, production provider connection, external send, payment movement, tax invoice issue, payroll disbursement, production go-live, or public release."
  ].join("\n") + "\n"
);

console.log(JSON.stringify({
  verdict: report.verdict,
  validation: KOREA_SAAS_FIT_VALIDATION_PATH,
  official_source_count: report.axis_b_korea_saas_operating_fit.official_source_count,
  matrix_row_count: report.axis_b_korea_saas_operating_fit.matrix_row_count
}, null, 2));
