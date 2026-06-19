#!/usr/bin/env node
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname } from "node:path";

const LEDGER_PATH = "workbook/launch-tuw/launch-tuw-ledger.json";
const LAUNCH_STATUS_AUDIT_PATH = "docs/launch/launch-tuw-status-audit.json";
const EVIDENCE_INTEGRITY_AUDIT_PATH = "docs/launch/launch-evidence-integrity-audit.json";
const REPORT_JSON_PATH = "docs/launch/launch-tuw-evidence-coverage-audit.json";
const REPORT_MD_PATH = "docs/launch/launch-tuw-evidence-coverage-audit.md";

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

function normalizeTuwEvidence(value) {
  if (Array.isArray(value)) {
    return {
      shape: "array",
      ids: value.map((entry) => entry?.tuw_id).filter(Boolean),
      entries: Object.fromEntries(value.filter((entry) => entry?.tuw_id).map((entry) => [entry.tuw_id, entry]))
    };
  }
  if (value && typeof value === "object") {
    return {
      shape: "object",
      ids: Object.keys(value),
      entries: value
    };
  }
  return {
    shape: value === undefined ? "missing" : typeof value,
    ids: [],
    entries: {}
  };
}

function evidenceStatus(entry) {
  if (!entry || typeof entry !== "object") return "missing";
  return String(entry.status ?? entry.final_state ?? entry.goal_closeout_claim ?? "recorded").trim() || "recorded";
}

function renderMarkdown(report) {
  const lines = [];
  lines.push("# Launch TUW Evidence Coverage Audit");
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
  lines.push("## Work Package Coverage");
  lines.push("");
  lines.push("| WP | Phase | Ledger TUW | Covered | Missing | Extra | Terminal covered | Shape |");
  lines.push("| --- | --- | ---: | ---: | ---: | ---: | --- | --- |");
  for (const row of report.work_packages) {
    lines.push(`| ${row.wp_id} | ${row.phase} | ${row.ledger_tuw_count} | ${row.covered_tuw_count} | ${row.missing_tuw_count} | ${row.extra_tuw_evidence_count} | ${row.terminal_tuw_covered} | ${row.evidence_shape} |`);
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
  lines.push("- This audit records TUW-to-command-evidence coverage only.");
  lines.push("- It does not approve go-live.");
  lines.push("- It does not approve owner deferrals.");
  lines.push("- Missing TUW evidence remains a launch completion blocker until every ledger TUW is linked to command/manual evidence or an owner-approved deferral coverage row.");
  lines.push("- Full Claude review remains waived by user instruction and is not valid review evidence.");
  lines.push("- Closed CP evidence remains read-only.");
  return `${lines.join("\n")}\n`;
}

const ledger = readJson(LEDGER_PATH);
const launchStatusAudit = readJson(LAUNCH_STATUS_AUDIT_PATH);
const evidenceIntegrityAudit = readJson(EVIDENCE_INTEGRITY_AUDIT_PATH);
const existingReport = existsSync(REPORT_JSON_PATH) ? readJson(REPORT_JSON_PATH) : null;
const findings = [];
const tuwsByWp = new Map();
for (const tuw of ledger.tuws) {
  const wpId = tuw.id.replace(/-T\d+$/, "");
  if (!tuwsByWp.has(wpId)) tuwsByWp.set(wpId, []);
  tuwsByWp.get(wpId).push(tuw);
}

if (launchStatusAudit.summary?.work_package_count !== ledger.work_packages.length) {
  addFinding(findings, "P1", "STATUS_AUDIT_WP_COUNT_MISMATCH", "Launch status audit WP count does not match ledger.", {
    expected: ledger.work_packages.length,
    actual: launchStatusAudit.summary?.work_package_count
  });
}

if (evidenceIntegrityAudit.verdict !== "PASS") {
  addFinding(findings, "P1", "EVIDENCE_INTEGRITY_NOT_PASS", "Launch evidence integrity audit is not PASS.", {
    actual: evidenceIntegrityAudit.verdict
  });
}

const workPackages = [];
for (const wp of ledger.work_packages) {
  const phase = phaseFromWpId(wp.wp_id);
  const commandPath = `docs/goal-closeout/${wp.goal_id}/command-evidence.json`;
  const ledgerTuws = tuwsByWp.get(wp.wp_id) ?? [];
  const ledgerTuwIds = ledgerTuws.map((tuw) => tuw.id);
  const row = {
    wp_id: wp.wp_id,
    goal_id: wp.goal_id,
    phase,
    evidence_base: `docs/goal-closeout/${wp.goal_id}`,
    command_evidence_path: commandPath,
    ledger_tuw_count: ledgerTuwIds.length,
    ledger_tuw_ids: ledgerTuwIds,
    command_evidence_present: existsSync(commandPath),
    evidence_shape: "missing",
    covered_tuw_count: 0,
    covered_tuw_ids: [],
    missing_tuw_count: ledgerTuwIds.length,
    missing_tuw_ids: ledgerTuwIds,
    extra_tuw_evidence_count: 0,
    extra_tuw_evidence_ids: [],
    terminal_tuw: wp.terminal_tuw,
    terminal_tuw_covered: false,
    covered_status_counts: {}
  };

  if (!row.command_evidence_present) {
    addFinding(findings, "P0", "COMMAND_EVIDENCE_MISSING", "Command evidence file is missing for launch WP.", {
      wp_id: wp.wp_id,
      command_path: commandPath
    });
    workPackages.push(row);
    continue;
  }

  const commandEvidence = readJson(commandPath);
  const normalized = normalizeTuwEvidence(commandEvidence.tuw_evidence);
  row.evidence_shape = normalized.shape;
  row.covered_tuw_ids = normalized.ids.filter((id) => ledgerTuwIds.includes(id)).sort();
  row.covered_tuw_count = row.covered_tuw_ids.length;
  row.missing_tuw_ids = ledgerTuwIds.filter((id) => !row.covered_tuw_ids.includes(id));
  row.missing_tuw_count = row.missing_tuw_ids.length;
  row.extra_tuw_evidence_ids = normalized.ids.filter((id) => !ledgerTuwIds.includes(id)).sort();
  row.extra_tuw_evidence_count = row.extra_tuw_evidence_ids.length;
  row.terminal_tuw_covered = row.covered_tuw_ids.includes(wp.terminal_tuw);
  for (const id of row.covered_tuw_ids) {
    const status = evidenceStatus(normalized.entries[id]);
    row.covered_status_counts[status] = (row.covered_status_counts[status] ?? 0) + 1;
  }
  workPackages.push(row);
}

const ledgerTuwCount = ledger.tuws.length;
const coveredLedgerTuwIds = [...new Set(workPackages.flatMap((row) => row.covered_tuw_ids))].sort();
const coveredLedgerTuwCount = coveredLedgerTuwIds.length;
const missingLedgerTuwIds = ledger.tuws.map((tuw) => tuw.id).filter((id) => !coveredLedgerTuwIds.includes(id));
const terminalMissingRows = workPackages.filter((row) => !row.terminal_tuw_covered);
const extraTuwEvidenceIds = [...new Set(workPackages.flatMap((row) => row.extra_tuw_evidence_ids))].sort();
const allLedgerTuwsEvidenceCovered = ledgerTuwCount > 0 && missingLedgerTuwIds.length === 0;
const allTerminalTuwsEvidenceCovered = terminalMissingRows.length === 0;
const verdict = findings.some((finding) => finding.severity === "P0" || finding.severity === "P1") ? "FAIL" : "PASS";
const report = {
  schema_version: "law-firm-os.launch-tuw-evidence-coverage-audit.v0.1",
  generated_at: existingReport?.generated_at ?? new Date().toISOString(),
  source_refs: [
    LEDGER_PATH,
    LAUNCH_STATUS_AUDIT_PATH,
    EVIDENCE_INTEGRITY_AUDIT_PATH,
    "docs/goal-closeout/<launch-goal-id>/command-evidence.json"
  ],
  verdict,
  boundary: {
    records_tuw_evidence_coverage_only: true,
    go_live_approved_by_this_audit: false,
    owner_deferrals_approved_by_this_audit: false,
    review_waiver_counts_as_valid_review_evidence: false,
    closed_cp_evidence_is_read_only: true
  },
  summary: {
    work_package_count: ledger.work_packages.length,
    ledger_tuw_count: ledgerTuwCount,
    covered_ledger_tuw_count: coveredLedgerTuwCount,
    missing_ledger_tuw_count: missingLedgerTuwIds.length,
    all_ledger_tuws_evidence_covered: allLedgerTuwsEvidenceCovered,
    terminal_tuw_count: ledger.work_packages.length,
    terminal_tuw_evidence_covered_count: workPackages.filter((row) => row.terminal_tuw_covered).length,
    terminal_tuw_missing_evidence_count: terminalMissingRows.length,
    all_terminal_tuws_evidence_covered: allTerminalTuwsEvidenceCovered,
    wp_with_missing_tuw_evidence_count: workPackages.filter((row) => row.missing_tuw_count > 0).length,
    extra_tuw_evidence_id_count: extraTuwEvidenceIds.length,
    finding_count: findings.length,
    p0_count: findings.filter((finding) => finding.severity === "P0").length,
    p1_count: findings.filter((finding) => finding.severity === "P1").length
  },
  missing_ledger_tuw_ids: missingLedgerTuwIds,
  extra_tuw_evidence_ids: extraTuwEvidenceIds,
  work_packages: workPackages,
  findings
};

mkdirSync(dirname(REPORT_JSON_PATH), { recursive: true });
writeFileSync(REPORT_JSON_PATH, `${JSON.stringify(report, null, 2)}\n`);
writeFileSync(REPORT_MD_PATH, renderMarkdown(report));

console.log(JSON.stringify({
  report_json: REPORT_JSON_PATH,
  report_markdown: REPORT_MD_PATH,
  verdict: report.verdict,
  ledger_tuw_count: report.summary.ledger_tuw_count,
  covered_ledger_tuw_count: report.summary.covered_ledger_tuw_count,
  missing_ledger_tuw_count: report.summary.missing_ledger_tuw_count,
  terminal_tuw_missing_evidence_count: report.summary.terminal_tuw_missing_evidence_count,
  wp_with_missing_tuw_evidence_count: report.summary.wp_with_missing_tuw_evidence_count,
  finding_count: report.summary.finding_count,
  p0_count: report.summary.p0_count,
  p1_count: report.summary.p1_count
}, null, 2));

if (report.verdict !== "PASS") {
  process.exit(1);
}
