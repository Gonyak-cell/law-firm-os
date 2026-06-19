#!/usr/bin/env node
import { existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";

const LAUNCH_DIR = "docs/launch";
const LAUNCH_STATUS_AUDIT_PATH = "docs/launch/launch-tuw-status-audit.json";
const DEFERRAL_COVERAGE_AUDIT_PATH = "docs/launch/launch-deferral-coverage-audit.json";
const REPORT_JSON_PATH = "docs/launch/launch-no-go-claim-policy-audit.json";
const REPORT_MD_PATH = "docs/launch/launch-no-go-claim-policy-audit.md";

const SAFE_STATUS_PATTERNS = [
  /^blocked(?:_|$)/,
  /^pending(?:_|$)/,
  /^draft(?:_|$)/,
  /^drafted_/,
  /^decision_brief_blocked(?:_|$)/,
  /^proposal_blocked(?:_|$)/,
  /^scope_drafted_pending(?:_|$)/,
  /^synthetic_command_draft_blocked(?:_|$)/,
  /^audit_completed_.*blocked/,
  /^report_draft_blocked(?:_|$)/,
  /^tabletop_scaffold_blocked(?:_|$)/,
  /^template_ready_no_decisions_recorded$/,
  /^t01_.*pending/,
  /^in_progress$/
];

const STATUS_ALLOWLIST = new Map([
  ["docs/launch/matter-naming-rules.md", new Set(["adopted_from_owner_decision"])]
]);

const JSON_STATUS_ALLOWLIST = new Map([
  ["docs/launch/g1-e02-evidence-satisfaction-2026-06-19.json", new Set(["evidence_satisfied"])],
  ["docs/launch/g1-e03-evidence-satisfaction-2026-06-19.json", new Set(["evidence_satisfied"])],
  ["docs/launch/scope-revision-register.json", new Set(["approved"])],
  ["docs/launch/kpi-baseline-data.json", new Set(["blocked_not_collected"])]
]);

const GENERATED_PASS_JSON_PATTERNS = [
  /^docs\/launch\/launch-.*(?:audit|validation)\.json$/,
  /^docs\/launch\/owner-action-deferral-request-validation\.json$/
];

const FORBIDDEN_TRUE_KEY_PATTERNS = [
  /(^|_)go_live(_.*)?_approved$/,
  /^go_live_all_pass$/,
  /^owner_approved_deferrals_present$/,
  /^all_required_deferrals_covered$/,
  /^go_live_deferral_coverage_complete$/,
  /^l9_deferral_coverage_complete$/,
  /^blocked_wp_deferral_coverage_complete$/,
  /^phase_exit_deferral_coverage_complete$/,
  /(^|_)owner_deferrals?_approved/,
  /^production_ready$/,
  /^cutover_executed$/,
  /^company_wide_rollout_executed$/,
  /^hypercare_started$/,
  /^pilot_window_started$/,
  /^uat_executed$/
];

const FORBIDDEN_STATUS_PATTERNS = [
  /^approved$/,
  /^executed$/,
  /^completed$/,
  /^closed$/,
  /^satisfied$/,
  /^accepted$/,
  /^go_live/,
  /^production_ready/,
  /^launched$/,
  /^live$/
];

function readJson(path) {
  return JSON.parse(readFileSync(path, "utf8"));
}

function listFiles(dir) {
  const files = [];
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) files.push(...listFiles(path));
    else if (path.endsWith(".md") || path.endsWith(".json")) files.push(path);
  }
  return files.sort();
}

function addFinding(findings, severity, code, message, details = {}) {
  findings.push({ severity, code, message, details });
}

function isGeneratedPassJson(path) {
  return GENERATED_PASS_JSON_PATTERNS.some((pattern) => pattern.test(path));
}

function statusAllowed(path, status) {
  if (STATUS_ALLOWLIST.get(path)?.has(status)) return true;
  return SAFE_STATUS_PATTERNS.some((pattern) => pattern.test(status));
}

function jsonStatusAllowed(path, status) {
  if (JSON_STATUS_ALLOWLIST.get(path)?.has(status)) return true;
  return SAFE_STATUS_PATTERNS.some((pattern) => pattern.test(status));
}

function booleanClaims(value, path = []) {
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
      claims.push(...booleanClaims(child, childPath));
    }
  }
  return claims;
}

function renderMarkdown(report) {
  const lines = [];
  lines.push("# Launch No-Go Claim Policy Audit");
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
    lines.push("| Severity | Code | File | Message |");
    lines.push("| --- | --- | --- | --- |");
    for (const finding of report.findings) {
      lines.push(`| ${finding.severity} | ${finding.code} | ${finding.details?.path ?? ""} | ${finding.message} |`);
    }
  }
  lines.push("");
  lines.push("## Boundary");
  lines.push("");
  lines.push("- This audit is a claim guard for the current No-Go state.");
  lines.push("- It does not approve go-live.");
  lines.push("- It does not approve owner deferrals.");
  lines.push("- Generated audit PASS verdicts are allowed only as audit results, not as launch approval.");
  lines.push("- Generated FAIL verdicts are allowed as blocked-state evidence; they are not launch approval claims.");
  lines.push("- Closed CP evidence remains read-only.");
  return `${lines.join("\n")}\n`;
}

const launchAudit = readJson(LAUNCH_STATUS_AUDIT_PATH);
const deferralCoverageAudit = readJson(DEFERRAL_COVERAGE_AUDIT_PATH);
const existingReport = existsSync(REPORT_JSON_PATH) ? readJson(REPORT_JSON_PATH) : null;
const findings = [];
const files = listFiles(LAUNCH_DIR);
const noGoActive =
  launchAudit.go_live_readiness.all_pass !== true &&
  deferralCoverageAudit.summary.all_required_deferrals_covered !== true;
const scannedFiles = [];

for (const path of files) {
  if (path.endsWith(".md")) {
    const text = readFileSync(path, "utf8");
    const statusMatch = text.match(/^Status:\s*(.+)$/m);
    const status = statusMatch?.[1]?.trim() ?? null;
    const row = {
      path,
      type: "markdown",
      status,
      status_policy: "not_applicable"
    };
    if (noGoActive && status) {
      row.status_policy = statusAllowed(path, status) ? "allowed_no_go_status" : "forbidden_or_unclassified_no_go_status";
      if (row.status_policy !== "allowed_no_go_status") {
        addFinding(findings, "P1", "NO_GO_MARKDOWN_STATUS_CLAIM", "Markdown launch artifact status is not safe for the current No-Go state.", {
          path,
          status
        });
      }
    }
    scannedFiles.push(row);
  } else if (path.endsWith(".json")) {
    const json = readJson(path);
    const status = typeof json.status === "string" ? json.status : null;
    const verdict = typeof json.verdict === "string" ? json.verdict : null;
    const claims = noGoActive ? booleanClaims(json) : [];
    const row = {
      path,
      type: "json",
      status,
      verdict,
      status_policy: "not_applicable",
      generated_pass_json: isGeneratedPassJson(path),
      forbidden_true_claims: claims
    };
    if (noGoActive && status) {
      row.status_policy = jsonStatusAllowed(path, status) ? "allowed_no_go_status" : "forbidden_or_unclassified_no_go_status";
      if (row.status_policy !== "allowed_no_go_status") {
        addFinding(findings, "P1", "NO_GO_JSON_STATUS_CLAIM", "JSON launch artifact status is not safe for the current No-Go state.", {
          path,
          status
        });
      }
    }
    if (noGoActive && verdict && verdict !== "PASS" && verdict !== "NOT_COMPLETE" && verdict !== "FAIL") {
      addFinding(findings, "P1", "NO_GO_JSON_VERDICT_CLAIM", "JSON launch artifact verdict is not safe for the current No-Go state.", {
        path,
        verdict
      });
    }
    if (noGoActive && claims.length > 0) {
      addFinding(findings, "P1", "NO_GO_FORBIDDEN_TRUE_CLAIM", "JSON launch artifact contains a forbidden true launch approval/readiness claim.", {
        path,
        claims
      });
    }
    scannedFiles.push(row);
  }
}

const verdict = findings.some((finding) => finding.severity === "P0" || finding.severity === "P1") ? "FAIL" : "PASS";
const report = {
  schema_version: "law-firm-os.launch-no-go-claim-policy-audit.v0.1",
  generated_at: existingReport?.generated_at ?? new Date().toISOString(),
  source_refs: [
    LAUNCH_STATUS_AUDIT_PATH,
    DEFERRAL_COVERAGE_AUDIT_PATH,
    `${LAUNCH_DIR}/**/*.{md,json}`
  ],
  verdict,
  boundary: {
    validates_claim_policy_only: true,
    go_live_approved_by_this_audit: false,
    owner_deferrals_approved_by_this_audit: false,
    review_waiver_counts_as_valid_review_evidence: false,
    closed_cp_evidence_is_read_only: true
  },
  summary: {
    scanned_file_count: scannedFiles.length,
    no_go_active: noGoActive,
    markdown_status_count: scannedFiles.filter((file) => file.type === "markdown" && file.status).length,
    json_status_count: scannedFiles.filter((file) => file.type === "json" && file.status).length,
    generated_pass_json_count: scannedFiles.filter((file) => file.generated_pass_json && file.verdict === "PASS").length,
    forbidden_true_claim_count: scannedFiles.reduce((count, file) => count + (file.forbidden_true_claims?.length ?? 0), 0),
    finding_count: findings.length,
    p0_count: findings.filter((finding) => finding.severity === "P0").length,
    p1_count: findings.filter((finding) => finding.severity === "P1").length
  },
  scanned_files: scannedFiles,
  findings
};

mkdirSync(dirname(REPORT_JSON_PATH), { recursive: true });
writeFileSync(REPORT_JSON_PATH, `${JSON.stringify(report, null, 2)}\n`);
writeFileSync(REPORT_MD_PATH, renderMarkdown(report));

console.log(JSON.stringify({
  report_json: REPORT_JSON_PATH,
  report_markdown: REPORT_MD_PATH,
  verdict: report.verdict,
  scanned_file_count: report.summary.scanned_file_count,
  no_go_active: report.summary.no_go_active,
  forbidden_true_claim_count: report.summary.forbidden_true_claim_count,
  finding_count: report.summary.finding_count,
  p0_count: report.summary.p0_count,
  p1_count: report.summary.p1_count
}, null, 2));

if (report.verdict !== "PASS") {
  process.exit(1);
}
