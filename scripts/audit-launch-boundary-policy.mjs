#!/usr/bin/env node
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname } from "node:path";

const LEDGER_PATH = "workbook/launch-tuw/launch-tuw-ledger.json";
const REPORT_JSON_PATH = "docs/launch/launch-boundary-policy-audit.json";
const REPORT_MD_PATH = "docs/launch/launch-boundary-policy-audit.md";

const FORBIDDEN_TRUE_KEY_PATTERNS = [
  /owner_.*approved/,
  /owner_.*signed/,
  /owner_acceptance_signed/,
  /owner_scope_approval_present/,
  /human_.*signoff/,
  /human_decision_synthesized/,
  /go_live_.*approved/,
  /live_go_readiness_approved/,
  /go_no_go.*decision/,
  /m365_admin_center_changed/,
  /addin_deployed/,
  /pilot_window_started/,
  /training_conducted/,
  /uat_executed/,
  /pilot_user_results_recorded/,
  /production_.*write/,
  /real_data_(used|loaded|present)/
];

function readJson(path) {
  return JSON.parse(readFileSync(path, "utf8"));
}

function phaseFromWpId(wpId) {
  if (wpId.startsWith("LT-PRE-")) return "PRE";
  const match = wpId.match(/^LT-(L\d+)-/);
  return match ? match[1] : "UNKNOWN";
}

function addFinding(findings, severity, code, message, details = {}) {
  findings.push({ severity, code, message, details });
}

function forbiddenTrueClaims(value, path = []) {
  if (!value || typeof value !== "object") return [];
  const claims = [];
  for (const [key, child] of Object.entries(value)) {
    const childPath = [...path, key];
    if (child === true && FORBIDDEN_TRUE_KEY_PATTERNS.some((pattern) => pattern.test(key))) {
      claims.push({
        path: childPath.join("."),
        key
      });
    } else if (child && typeof child === "object") {
      claims.push(...forbiddenTrueClaims(child, childPath));
    }
  }
  return claims;
}

function renderMarkdown(report) {
  const lines = [];
  lines.push("# Launch Boundary Policy Audit");
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
    lines.push("| Severity | Code | WP | Message |");
    lines.push("| --- | --- | --- | --- |");
    for (const finding of report.findings) {
      lines.push(`| ${finding.severity} | ${finding.code} | ${finding.details.wp_id ?? ""} | ${finding.message} |`);
    }
  }
  lines.push("");
  lines.push("## Boundary");
  lines.push("");
  lines.push("- Launch work remains synthetic-data-only until policy gates allow otherwise.");
  lines.push("- Launch command evidence must not write product state.");
  lines.push("- Closed CP evidence remains read-only.");
  lines.push("- Owner approvals, go-live decisions, M365/admin changes, UAT execution, pilot operation, and production runtime evidence must not be synthesized.");
  return `${lines.join("\n")}\n`;
}

const ledger = readJson(LEDGER_PATH);
const findings = [];
const workPackages = [];

for (const wp of ledger.work_packages) {
  const base = `docs/goal-closeout/${wp.goal_id}`;
  const commandPath = `${base}/command-evidence.json`;
  const row = {
    wp_id: wp.wp_id,
    goal_id: wp.goal_id,
    phase: phaseFromWpId(wp.wp_id),
    evidence_base: base,
    no_real_data: null,
    writes_product_state: null,
    closed_cp_evidence_is_read_only: null,
    human_decision_synthesized: null,
    completion_claim: null,
    forbidden_true_claims: []
  };

  if (!existsSync(commandPath)) {
    addFinding(findings, "P0", "COMMAND_EVIDENCE_MISSING", "Launch command evidence is missing.", {
      wp_id: wp.wp_id,
      goal_id: wp.goal_id,
      path: commandPath
    });
    workPackages.push(row);
    continue;
  }

  const command = readJson(commandPath);
  row.no_real_data = command.no_real_data ?? null;
  row.writes_product_state = command.writes_product_state ?? null;
  row.closed_cp_evidence_is_read_only = command.closed_cp_evidence_is_read_only ?? null;
  row.human_decision_synthesized = command.human_decision_synthesized ?? null;
  row.completion_claim = command.completion_claim ?? null;
  row.forbidden_true_claims = forbiddenTrueClaims(command);

  if (command.no_real_data !== true) {
    addFinding(findings, "P1", "NO_REAL_DATA_BOUNDARY_MISSING", "Launch command evidence must explicitly keep no_real_data=true.", {
      wp_id: wp.wp_id,
      goal_id: wp.goal_id,
      actual: command.no_real_data
    });
  }
  if (command.writes_product_state !== false) {
    addFinding(findings, "P1", "PRODUCT_STATE_WRITE_BOUNDARY_MISSING", "Launch command evidence must explicitly keep writes_product_state=false.", {
      wp_id: wp.wp_id,
      goal_id: wp.goal_id,
      actual: command.writes_product_state
    });
  }
  if (command.closed_cp_evidence_is_read_only !== true) {
    addFinding(findings, "P1", "CLOSED_CP_READ_ONLY_BOUNDARY_MISSING", "Launch command evidence must explicitly keep closed CP evidence read-only.", {
      wp_id: wp.wp_id,
      goal_id: wp.goal_id,
      actual: command.closed_cp_evidence_is_read_only
    });
  }
  if (command.human_decision_synthesized === true) {
    addFinding(findings, "P1", "HUMAN_DECISION_SYNTHESIZED", "Launch command evidence must not synthesize human decisions.", {
      wp_id: wp.wp_id,
      goal_id: wp.goal_id
    });
  }
  if (row.forbidden_true_claims.length > 0) {
    addFinding(findings, "P1", "FORBIDDEN_TRUE_BOUNDARY_CLAIM", "Launch command evidence contains a forbidden true approval/runtime claim.", {
      wp_id: wp.wp_id,
      goal_id: wp.goal_id,
      claims: row.forbidden_true_claims
    });
  }

  workPackages.push(row);
}

const verdict = findings.some((finding) => finding.severity === "P0" || finding.severity === "P1") ? "FAIL" : "PASS";
const existingReport = existsSync(REPORT_JSON_PATH) ? readJson(REPORT_JSON_PATH) : null;
const report = {
  schema_version: "law-firm-os.launch-boundary-policy-audit.v0.1",
  generated_at: existingReport?.generated_at ?? new Date().toISOString(),
  source_refs: [
    LEDGER_PATH,
    "docs/goal-closeout/<launch_goal_id>/command-evidence.json"
  ],
  verdict,
  summary: {
    work_package_count: workPackages.length,
    no_real_data_true_count: workPackages.filter((wp) => wp.no_real_data === true).length,
    writes_product_state_false_count: workPackages.filter((wp) => wp.writes_product_state === false).length,
    closed_cp_evidence_read_only_count: workPackages.filter((wp) => wp.closed_cp_evidence_is_read_only === true).length,
    human_decision_synthesized_false_or_absent_count: workPackages.filter((wp) => wp.human_decision_synthesized !== true).length,
    completion_claim_false_or_absent_count: workPackages.filter((wp) => wp.completion_claim !== true).length,
    forbidden_true_claim_count: workPackages.reduce((count, wp) => count + wp.forbidden_true_claims.length, 0),
    finding_count: findings.length,
    p0_count: findings.filter((finding) => finding.severity === "P0").length,
    p1_count: findings.filter((finding) => finding.severity === "P1").length
  },
  boundary: {
    synthetic_data_only_until_policy_gates_allow: true,
    writes_product_state_allowed_by_this_audit: false,
    closed_cp_evidence_is_read_only: true,
    human_decisions_synthesized_by_this_audit: false,
    go_live_approved_by_this_audit: false,
    owner_deferrals_approved_by_this_audit: false
  },
  work_packages: workPackages,
  findings
};

mkdirSync(dirname(REPORT_JSON_PATH), { recursive: true });
writeFileSync(REPORT_JSON_PATH, `${JSON.stringify(report, null, 2)}\n`);
writeFileSync(REPORT_MD_PATH, renderMarkdown(report));

console.log(JSON.stringify({
  report_json: REPORT_JSON_PATH,
  report_markdown: REPORT_MD_PATH,
  verdict,
  work_package_count: report.summary.work_package_count,
  no_real_data_true_count: report.summary.no_real_data_true_count,
  writes_product_state_false_count: report.summary.writes_product_state_false_count,
  closed_cp_evidence_read_only_count: report.summary.closed_cp_evidence_read_only_count,
  forbidden_true_claim_count: report.summary.forbidden_true_claim_count,
  finding_count: report.summary.finding_count,
  p0_count: report.summary.p0_count,
  p1_count: report.summary.p1_count
}, null, 2));

if (verdict !== "PASS") {
  process.exit(1);
}
