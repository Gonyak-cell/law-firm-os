#!/usr/bin/env node
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname } from "node:path";
import { summarizeLaunchDecisionRegister } from "./lib/launch-decision-register.mjs";

const REGISTER_PATH = "docs/launch/launch-decision-register.md";
const REPORT_JSON_PATH = "docs/launch/launch-decision-register-validation.json";
const REPORT_MD_PATH = "docs/launch/launch-decision-register-validation.md";
const REQUIRED_DEFERRAL_COVERAGE_KEY_RULE_TOKENS = [
  "ACC-GL-<gate>-<evidence>",
  "COVERAGE-GATE-<gate>",
  "COVERAGE-ALL-GO-LIVE",
  "ACC-L9-C##",
  "COVERAGE-L9-STABILIZATION",
  "WP-<wp_id>",
  "COVERAGE-PHASE-<phase>",
  "COVERAGE-ALL-BLOCKED-WP",
  "PHASE-<phase>",
  "PHASE-<exit_gate>",
  "COVERAGE-ALL-PHASE-EXITS"
];

function readJson(path) {
  return JSON.parse(readFileSync(path, "utf8"));
}

function renderMarkdown(report) {
  const lines = [];
  lines.push("# Launch Decision Register Validation");
  lines.push("");
  lines.push(`Generated at: ${report.generated_at}`);
  lines.push("");
  lines.push(`Verdict: ${report.verdict}`);
  lines.push("");
  lines.push("## Summary");
  lines.push("");
  for (const [key, value] of Object.entries(report.summary)) {
    lines.push(`- ${key}: ${value}`);
  }
  lines.push("");
  lines.push("## Findings");
  lines.push("");
  if (report.findings.length === 0) {
    lines.push("No findings.");
  } else {
    lines.push("| Severity | Code | Message |");
    lines.push("| --- | --- | --- |");
    for (const finding of report.findings) {
      lines.push(`| ${finding.severity} | ${finding.code} | ${finding.message} |`);
    }
  }
  lines.push("");
  lines.push("## Boundary");
  lines.push("");
  lines.push("- This validation checks launch decision register structure only.");
  lines.push("- It does not approve go-live.");
  lines.push("- It does not approve or create owner deferrals.");
  lines.push("- Only complete `deferred(시한 명기)` rows with owner, basis, target date or revisit gate, and approval signature count as owner-approved deferrals.");
  return `${lines.join("\n")}\n`;
}

const existingReport = existsSync(REPORT_JSON_PATH) ? readJson(REPORT_JSON_PATH) : null;
const generatedAt = existingReport?.generated_at ?? new Date().toISOString();
const registerText = existsSync(REGISTER_PATH) ? readFileSync(REGISTER_PATH, "utf8") : "";
const decisionSummary = summarizeLaunchDecisionRegister(REGISTER_PATH);
const findings = [];

if (!decisionSummary.exists) {
  findings.push({
    severity: "P0",
    code: "DECISION_REGISTER_MISSING",
    message: "Launch decision register is missing.",
    details: { path: REGISTER_PATH }
  });
}

for (const row of decisionSummary.invalid_rows) {
  findings.push({
    severity: "P1",
    code: "DECISION_REGISTER_INVALID_ROW",
    message: "Decision register row is incomplete or has an unsupported status.",
    details: row
  });
}

const missingDeferralCoverageKeyRuleTokens = REQUIRED_DEFERRAL_COVERAGE_KEY_RULE_TOKENS.filter(
  (token) => !registerText.includes(token)
);
if (missingDeferralCoverageKeyRuleTokens.length > 0) {
  findings.push({
    severity: "P1",
    code: "DEFERRAL_COVERAGE_KEY_RULES_MISSING",
    message: "Launch decision register does not document all deferral coverage decision-id patterns.",
    details: {
      missing_tokens: missingDeferralCoverageKeyRuleTokens
    }
  });
}

const verdict = findings.some((finding) => finding.severity === "P0" || finding.severity === "P1") ? "FAIL" : "PASS";
const report = {
  schema_version: "law-firm-os.launch-decision-register.validation.v0.1",
  generated_at: generatedAt,
  source_refs: [REGISTER_PATH],
  verdict,
  summary: {
    register_exists: decisionSummary.exists,
    total_rows: decisionSummary.total_rows,
    decided_rows: decisionSummary.decided_rows,
    deferred_rows: decisionSummary.deferred_rows,
    valid_decided_rows: decisionSummary.valid_decided_rows,
    valid_deferred_rows: decisionSummary.valid_deferred_rows,
    coverage_eligible_valid_deferred_rows: decisionSummary.coverage_eligible_valid_deferred_rows,
    non_coverage_valid_deferred_rows: decisionSummary.non_coverage_valid_deferred_rows,
    invalid_decision_rows: decisionSummary.invalid_decision_rows,
    owner_approved_deferrals_present: decisionSummary.owner_approved_deferrals_present,
    deferral_coverage_key_rules_documented: missingDeferralCoverageKeyRuleTokens.length === 0,
    missing_deferral_coverage_key_rule_count: missingDeferralCoverageKeyRuleTokens.length,
    finding_count: findings.length,
    p0_count: findings.filter((finding) => finding.severity === "P0").length,
    p1_count: findings.filter((finding) => finding.severity === "P1").length
  },
  boundary: {
    validates_structure_only: true,
    go_live_approved_by_validation: false,
    owner_deferrals_approved_by_validation: false,
    review_waiver_counts_as_valid_review_evidence: false
  },
  launch_decisions: decisionSummary,
  findings
};

mkdirSync(dirname(REPORT_JSON_PATH), { recursive: true });
writeFileSync(REPORT_JSON_PATH, `${JSON.stringify(report, null, 2)}\n`);
writeFileSync(REPORT_MD_PATH, renderMarkdown(report));

console.log(JSON.stringify({
  report_json: REPORT_JSON_PATH,
  report_markdown: REPORT_MD_PATH,
  verdict,
  owner_approved_deferrals_present: decisionSummary.owner_approved_deferrals_present,
  valid_deferred_rows: decisionSummary.valid_deferred_rows,
  invalid_decision_rows: decisionSummary.invalid_decision_rows
}, null, 2));

if (verdict !== "PASS") {
  process.exit(1);
}
