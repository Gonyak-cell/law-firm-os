#!/usr/bin/env node
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname } from "node:path";

const LEDGER_PATH = "workbook/launch-tuw/launch-tuw-ledger.json";
const STATUS_AUDIT_PATH = "docs/launch/launch-tuw-status-audit.json";
const REPORT_JSON_PATH = "docs/launch/launch-evidence-integrity-audit.json";
const REPORT_MD_PATH = "docs/launch/launch-evidence-integrity-audit.md";
const STANDARD_EVIDENCE_FILES = [
  "packet.json",
  "command-evidence.json",
  "claude-review-result.json",
  "adjudication.md",
  "construction-inspection.json"
];

function readJson(path) {
  return JSON.parse(readFileSync(path, "utf8"));
}

function phaseFromWpId(wpId) {
  if (wpId.startsWith("LT-PRE-")) return "PRE";
  const match = wpId.match(/^LT-(L\d+)-/);
  return match ? match[1] : "UNKNOWN";
}

function sorted(values) {
  return [...values].sort();
}

function sameSet(left, right) {
  const a = sorted(left ?? []);
  const b = sorted(right ?? []);
  return a.length === b.length && a.every((value, index) => value === b[index]);
}

function addFinding(findings, severity, code, message, details = {}) {
  findings.push({ severity, code, message, details });
}

function renderMarkdown(report) {
  const lines = [];
  lines.push("# Launch Evidence Integrity Audit");
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
    lines.push("| Severity | Code | Message | WP |");
    lines.push("| --- | --- | --- | --- |");
    for (const finding of report.findings) {
      lines.push(`| ${finding.severity} | ${finding.code} | ${finding.message} | ${finding.details?.wp_id ?? ""} |`);
    }
  }
  lines.push("");
  lines.push("## Boundary");
  lines.push("");
  lines.push("- This audit validates launch evidence metadata integrity only.");
  lines.push("- It does not approve go-live.");
  lines.push("- It does not approve owner deferrals.");
  lines.push("- It does not treat review waiver as valid review evidence.");
  lines.push("- Closed CP evidence remains read-only.");
  return `${lines.join("\n")}\n`;
}

const ledger = readJson(LEDGER_PATH);
const statusAudit = readJson(STATUS_AUDIT_PATH);
const existingReport = existsSync(REPORT_JSON_PATH) ? readJson(REPORT_JSON_PATH) : null;
const findings = [];
const rows = [];

for (const wp of ledger.work_packages) {
  const phase = phaseFromWpId(wp.wp_id);
  const base = `docs/goal-closeout/${wp.goal_id}`;
  const files = Object.fromEntries(STANDARD_EVIDENCE_FILES.map((file) => [file, existsSync(`${base}/${file}`)]));
  const missingFiles = Object.entries(files).filter(([, present]) => !present).map(([file]) => file);
  if (missingFiles.length > 0) {
    addFinding(findings, "P0", "MISSING_STANDARD_EVIDENCE_FILE", "Launch WP is missing standard evidence files.", {
      wp_id: wp.wp_id,
      goal_id: wp.goal_id,
      missing_files: missingFiles
    });
    rows.push({
      wp_id: wp.wp_id,
      goal_id: wp.goal_id,
      phase,
      integrity_status: "failed_missing_files",
      missing_files: missingFiles
    });
    continue;
  }

  const packet = readJson(`${base}/packet.json`);
  const command = readJson(`${base}/command-evidence.json`);
  const review = readJson(`${base}/claude-review-result.json`);
  const construction = readJson(`${base}/construction-inspection.json`);
  const wpFindingsBefore = findings.length;

  for (const [name, value] of [
    ["packet.work_package_id", packet.work_package_id],
    ["command.work_package_id", command.work_package_id],
    ["review.work_package_id", review.work_package_id],
    ["construction.work_package_id", construction.work_package_id]
  ]) {
    if (value !== wp.wp_id) {
      addFinding(findings, "P1", "WORK_PACKAGE_ID_MISMATCH", `${name} does not match ledger WP id.`, {
        wp_id: wp.wp_id,
        expected: wp.wp_id,
        actual: value
      });
    }
  }

  if (packet.terminal_tuw !== wp.terminal_tuw) {
    addFinding(findings, "P1", "TERMINAL_TUW_MISMATCH", "packet.terminal_tuw does not match ledger terminal TUW.", {
      wp_id: wp.wp_id,
      expected: wp.terminal_tuw,
      actual: packet.terminal_tuw
    });
  }

  if (!sameSet(packet.gate_binding, wp.gate_binding)) {
    addFinding(findings, "P1", "GATE_BINDING_MISMATCH", "packet.gate_binding does not match ledger gate binding.", {
      wp_id: wp.wp_id,
      expected: wp.gate_binding,
      actual: packet.gate_binding
    });
  }

  if (packet.phase !== phase) {
    addFinding(findings, "P1", "PHASE_MISMATCH", "packet.phase does not match ledger-derived phase.", {
      wp_id: wp.wp_id,
      expected: phase,
      actual: packet.phase
    });
  }

  if (command.phase !== phase) {
    addFinding(findings, "P1", "COMMAND_PHASE_MISMATCH", "command-evidence.phase does not match ledger-derived phase.", {
      wp_id: wp.wp_id,
      expected: phase,
      actual: command.phase
    });
  }

  if (command.no_real_data !== true || command.writes_product_state !== false || command.closed_cp_evidence_is_read_only !== true) {
    addFinding(findings, "P0", "COMMAND_BOUNDARY_MISMATCH", "command-evidence boundary fields are not launch-safe.", {
      wp_id: wp.wp_id,
      no_real_data: command.no_real_data,
      writes_product_state: command.writes_product_state,
      closed_cp_evidence_is_read_only: command.closed_cp_evidence_is_read_only
    });
  }

  if (review.status !== "review_waived_by_user" || review.valid_review_evidence !== false || review.model_not_run !== true) {
    addFinding(findings, "P0", "REVIEW_WAIVER_METADATA_MISMATCH", "review waiver metadata is not policy-safe.", {
      wp_id: wp.wp_id,
      status: review.status,
      valid_review_evidence: review.valid_review_evidence,
      model_not_run: review.model_not_run
    });
  }

  if (construction.production_ready !== false) {
    addFinding(findings, "P0", "CONSTRUCTION_PRODUCTION_READY_MISMATCH", "construction-inspection must not claim launch production readiness.", {
      wp_id: wp.wp_id,
      actual: construction.production_ready
    });
  }

  rows.push({
    wp_id: wp.wp_id,
    goal_id: wp.goal_id,
    phase,
    integrity_status: findings.length === wpFindingsBefore ? "pass" : "failed",
    evidence_base: base
  });
}

const statusAuditIds = (statusAudit.work_packages ?? []).map((wp) => wp.wp_id);
const ledgerIds = ledger.work_packages.map((wp) => wp.wp_id);
if (!sameSet(statusAuditIds, ledgerIds)) {
  addFinding(findings, "P0", "STATUS_AUDIT_LEDGER_MISMATCH", "Launch status audit WP ids do not match ledger.", {
    expected_count: ledgerIds.length,
    actual_count: statusAuditIds.length,
    missing: ledgerIds.filter((id) => !statusAuditIds.includes(id)),
    unexpected: statusAuditIds.filter((id) => !ledgerIds.includes(id))
  });
}

const verdict = findings.some((finding) => finding.severity === "P0" || finding.severity === "P1") ? "FAIL" : "PASS";
const report = {
  schema_version: "law-firm-os.launch-evidence-integrity-audit.v0.1",
  generated_at: existingReport?.generated_at ?? new Date().toISOString(),
  source_refs: [
    LEDGER_PATH,
    STATUS_AUDIT_PATH,
    "docs/goal-closeout/<launch-goal-id>/packet.json",
    "docs/goal-closeout/<launch-goal-id>/command-evidence.json",
    "docs/goal-closeout/<launch-goal-id>/claude-review-result.json",
    "docs/goal-closeout/<launch-goal-id>/construction-inspection.json"
  ],
  verdict,
  boundary: {
    validates_metadata_integrity_only: true,
    go_live_approved_by_this_audit: false,
    owner_deferrals_approved_by_this_audit: false,
    review_waiver_counts_as_valid_review_evidence: false,
    closed_cp_evidence_is_read_only: true
  },
  summary: {
    work_package_count: ledger.work_packages.length,
    standard_evidence_file_count_per_wp: STANDARD_EVIDENCE_FILES.length,
    integrity_pass_count: rows.filter((row) => row.integrity_status === "pass").length,
    integrity_failed_count: rows.filter((row) => row.integrity_status !== "pass").length,
    finding_count: findings.length,
    p0_count: findings.filter((finding) => finding.severity === "P0").length,
    p1_count: findings.filter((finding) => finding.severity === "P1").length
  },
  rows,
  findings
};

mkdirSync(dirname(REPORT_JSON_PATH), { recursive: true });
writeFileSync(REPORT_JSON_PATH, `${JSON.stringify(report, null, 2)}\n`);
writeFileSync(REPORT_MD_PATH, renderMarkdown(report));

console.log(JSON.stringify({
  report_json: REPORT_JSON_PATH,
  report_markdown: REPORT_MD_PATH,
  verdict: report.verdict,
  work_package_count: report.summary.work_package_count,
  integrity_pass_count: report.summary.integrity_pass_count,
  integrity_failed_count: report.summary.integrity_failed_count,
  finding_count: report.summary.finding_count,
  p0_count: report.summary.p0_count,
  p1_count: report.summary.p1_count
}, null, 2));

if (report.verdict !== "PASS") {
  process.exit(1);
}
