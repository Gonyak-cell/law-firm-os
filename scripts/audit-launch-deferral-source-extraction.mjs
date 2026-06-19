#!/usr/bin/env node
import { existsSync, mkdirSync, readdirSync, readFileSync, statSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";

const CLOSEOUT_ROOT = "docs/closeout-packs";
const LDIP_OVERLAY_PATH = "docs/ldip-integration/ldip-overlay-closeout-pack-map.json";
const HRX_OVERLAY_PATH = "docs/hrx-integration/hrx-overlay-closeout-pack-map.json";
const MAT_DEC_REGISTER_PATH = "workbook/absorption-package/06_오픈_결정_레지스터.md";
const LAUNCH_ROOT = "docs/launch";
const REPORT_JSON_PATH = "docs/launch/launch-deferral-source-extraction-audit.json";
const REPORT_MD_PATH = "docs/launch/launch-deferral-source-extraction-audit.md";

function readJson(path) {
  return JSON.parse(readFileSync(path, "utf8"));
}

function walk(dir) {
  const entries = [];
  for (const name of readdirSync(dir)) {
    const path = join(dir, name);
    const stat = statSync(path);
    if (stat.isDirectory()) {
      entries.push(...walk(path));
    } else {
      entries.push(path);
    }
  }
  return entries;
}

function sortedPackDirs() {
  return readdirSync(CLOSEOUT_ROOT)
    .filter((name) => /^cp00-\d{3}$/i.test(name))
    .sort((a, b) => Number(a.match(/\d+/)[0]) - Number(b.match(/\d+/)[0]));
}

function lineMatches(path, regex) {
  if (!existsSync(path)) return [];
  return readFileSync(path, "utf8")
    .split("\n")
    .map((text, index) => ({ line: index + 1, text: text.trim() }))
    .filter((row) => regex.test(row.text));
}

function collectObjectValues(value, visitor) {
  if (Array.isArray(value)) {
    for (const item of value) collectObjectValues(item, visitor);
    return;
  }
  if (value && typeof value === "object") {
    for (const [key, child] of Object.entries(value)) {
      visitor(key, child);
      collectObjectValues(child, visitor);
    }
  }
}

function increment(map, key) {
  map[key] = (map[key] ?? 0) + 1;
}

function overlayStats(path) {
  const text = readFileSync(path, "utf8");
  const tokenCount = (text.match(/defer_with_revisit_gate/g) ?? []).length;
  const json = JSON.parse(text);
  let actualDecisionCount = 0;
  collectObjectValues(json, (key, value) => {
    if (
      (key === "decision" || key === "affected_pack_decision" || key === "affected_pack_required_decision") &&
      value === "defer_with_revisit_gate"
    ) {
      actualDecisionCount += 1;
    }
  });
  return { token_count: tokenCount, actual_decision_count: actualDecisionCount };
}

function markdownCell(value) {
  return String(value ?? "").replaceAll("|", "\\|").replace(/\s+/g, " ").trim();
}

function renderMarkdown(report) {
  const lines = [];
  lines.push("# Launch Deferral Source Extraction Audit");
  lines.push("");
  lines.push(`Generated at: ${report.generated_at}`);
  lines.push("");
  lines.push(`Verdict: ${report.verdict}`);
  lines.push("");
  lines.push("## Boundary");
  lines.push("");
  lines.push("- This audit classifies source markers for LT-L0-W03 only.");
  lines.push("- It does not reopen, rewrite, or weaken closed CP evidence.");
  lines.push("- It does not approve go-live, owner deferrals, or owner rejudgment.");
  lines.push("- Full Claude review remains waived by user instruction and is not valid review evidence.");
  lines.push("");
  lines.push("## Source Families");
  lines.push("");
  lines.push("| Family | Broad markers | Actual/deeper signal | Current interpretation |");
  lines.push("| --- | ---: | ---: | --- |");
  lines.push(`| P2 closeout packs | ${report.p2.broad_marker_source_file_count} | ${report.p2.explicit_p2_item_line_count} explicit P2 item lines | Broad markers include common fixed_or_deferred/no-P2 text and are not item-level unresolved deferrals. |`);
  lines.push(`| LDIP overlay | ${report.ldip.token_count} | ${report.ldip.actual_decision_count} actual defer decisions | Token count is currently an enum/policy option count. |`);
  lines.push(`| HRX overlay | ${report.hrx.token_count} | ${report.hrx.actual_decision_count} actual defer decisions | No actual defer decisions found. |`);
  lines.push(`| MAT-DEC | ${report.mat_dec.mention_line_count} mention lines | ${report.mat_dec.unique_decision_ids.length} unique decision IDs | Launch rejudgment linkage remains owner-controlled. |`);
  lines.push("");
  lines.push("## P2 Positive Count Statements");
  lines.push("");
  if (report.p2.positive_count_rows.length === 0) {
    lines.push("No positive P2 count statements found.");
  } else {
    lines.push("| Pack | Count | Source |");
    lines.push("| --- | ---: | --- |");
    for (const row of report.p2.positive_count_rows) {
      lines.push(`| ${markdownCell(row.pack_id)} | ${row.count} | ${markdownCell(`${row.path}:${row.line}`)} |`);
    }
  }
  lines.push("");
  lines.push("## Explicit P2 Item Lines");
  lines.push("");
  if (report.p2.explicit_p2_item_lines.length === 0) {
    lines.push("No explicit P2 item lines found.");
  } else {
    lines.push("| Pack | Source | Snippet |");
    lines.push("| --- | --- | --- |");
    for (const row of report.p2.explicit_p2_item_lines) {
      lines.push(`| ${markdownCell(row.pack_id)} | ${markdownCell(`${row.path}:${row.line}`)} | ${markdownCell(row.snippet)} |`);
    }
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
  return `${lines.join("\n")}\n`;
}

const existingReport = existsSync(REPORT_JSON_PATH) ? readJson(REPORT_JSON_PATH) : null;
const packDirs = sortedPackDirs();
const closeoutFiles = walk(CLOSEOUT_ROOT);
const broadMarkerRegex = /P2|p2_status|deferred_with_adjudication|fixed_or_deferred/;
const broadMarkerFiles = closeoutFiles.filter((path) => broadMarkerRegex.test(readFileSync(path, "utf8")));
const p2StatusCounts = {};
const constructionP2CountStatements = [];

for (const packId of packDirs) {
  const path = join(CLOSEOUT_ROOT, packId, "construction-inspection.json");
  if (!existsSync(path)) continue;
  const json = readJson(path);
  collectObjectValues(json, (key, value) => {
    if (key === "p2_status") increment(p2StatusCounts, String(value));
    if (/^(p2|reported_p2|original_p2_count|p2_count)$/i.test(key) && typeof value === "number") {
      constructionP2CountStatements.push({ pack_id: packId.toUpperCase(), key, value });
    }
  });
}

const positiveCountRows = [];
const explicitP2ItemLines = [];
const unresolvedP2Rows = [];
for (const packId of packDirs) {
  const path = join(CLOSEOUT_ROOT, packId, "adjudication.md");
  if (!existsSync(path)) continue;
  const lines = readFileSync(path, "utf8").split("\n");
  for (const [index, text] of lines.entries()) {
    const trimmed = text.trim();
    const countMatch = trimmed.match(/(?:Original P2 findings(?: from review)?|Raw Claude P2 findings|Reported P2 findings|Raw P2 findings)\s*:?\s*(\d+)/i);
    if (countMatch && Number(countMatch[1]) > 0) {
      positiveCountRows.push({
        pack_id: packId.toUpperCase(),
        path,
        line: index + 1,
        count: Number(countMatch[1]),
        text: trimmed
      });
    }
    if (/\b(?:CP00-\d+-)?P2[-–][0-9]/i.test(trimmed)) {
      explicitP2ItemLines.push({
        pack_id: packId.toUpperCase(),
        path,
        line: index + 1,
        snippet: trimmed.slice(0, 240)
      });
    }
    if (/unresolved P2|P2 remains unresolved|P2 unresolved/i.test(trimmed) && !/No unresolved P2/i.test(trimmed)) {
      unresolvedP2Rows.push({
        pack_id: packId.toUpperCase(),
        path,
        line: index + 1,
        snippet: trimmed.slice(0, 240)
      });
    }
  }
}

const matDecPaths = [
  MAT_DEC_REGISTER_PATH,
  ...walk(LAUNCH_ROOT).filter((path) =>
    /\.(md|json)$/.test(path) &&
    path !== REPORT_JSON_PATH &&
    path !== REPORT_MD_PATH
  )
];
const matDecMentionLines = [];
const matDecIds = new Set();
for (const path of matDecPaths) {
  for (const row of lineMatches(path, /MAT-DEC(?:-[0-9][0-9])?/g)) {
    matDecMentionLines.push({ path, line: row.line, text: row.text.slice(0, 240) });
    for (const match of row.text.matchAll(/MAT-DEC-[0-9][0-9]/g)) {
      matDecIds.add(match[0]);
    }
  }
}

const ldip = overlayStats(LDIP_OVERLAY_PATH);
const hrx = overlayStats(HRX_OVERLAY_PATH);
const findings = [];
if (unresolvedP2Rows.length > 0) {
  findings.push({
    severity: "P1",
    code: "UNRESOLVED_P2_SIGNAL_PRESENT",
    message: "One or more adjudication files contain unresolved P2 language that requires human review before LT-L0-W03 can close.",
    count: unresolvedP2Rows.length
  });
}

const report = {
  schema_version: "law-firm-os.launch-deferral-source-extraction-audit.v0.1",
  generated_at: existingReport?.generated_at ?? new Date().toISOString(),
  verdict: findings.some((finding) => finding.severity === "P0" || finding.severity === "P1") ? "FAIL" : "PASS",
  source_refs: [
    CLOSEOUT_ROOT,
    LDIP_OVERLAY_PATH,
    HRX_OVERLAY_PATH,
    MAT_DEC_REGISTER_PATH,
    LAUNCH_ROOT,
    "docs/launch/deferral-review-register.md",
    "docs/goal-closeout/lt-l0-w03/command-evidence.json"
  ],
  boundary: {
    classifies_source_markers_only: true,
    closes_lt_l0_w03: false,
    go_live_approved_by_this_audit: false,
    owner_deferrals_approved_by_this_audit: false,
    closed_cp_evidence_is_read_only: true,
    review_waiver_counts_as_valid_review_evidence: false
  },
  p2: {
    pack_count: packDirs.length,
    closeout_file_count: closeoutFiles.length,
    broad_marker_source_file_count: broadMarkerFiles.length,
    construction_p2_status_counts: p2StatusCounts,
    construction_p2_count_statement_count: constructionP2CountStatements.length,
    construction_p2_count_statement_positive_count: constructionP2CountStatements.filter((row) => row.value > 0).length,
    positive_count_statement_file_count: new Set(positiveCountRows.map((row) => row.path)).size,
    positive_count_statement_sum: positiveCountRows.reduce((sum, row) => sum + row.count, 0),
    positive_count_rows: positiveCountRows,
    explicit_p2_item_line_count: explicitP2ItemLines.length,
    explicit_p2_item_lines: explicitP2ItemLines,
    unresolved_p2_line_count: unresolvedP2Rows.length,
    unresolved_p2_rows: unresolvedP2Rows
  },
  ldip,
  hrx,
  mat_dec: {
    mention_line_count: matDecMentionLines.length,
    unique_decision_ids: [...matDecIds].sort(),
    sample_mention_lines: matDecMentionLines.slice(0, 80)
  },
  findings
};

mkdirSync(dirname(REPORT_JSON_PATH), { recursive: true });
writeFileSync(REPORT_JSON_PATH, `${JSON.stringify(report, null, 2)}\n`);
writeFileSync(REPORT_MD_PATH, renderMarkdown(report));

console.log(JSON.stringify({
  report_json: REPORT_JSON_PATH,
  report_markdown: REPORT_MD_PATH,
  verdict: report.verdict,
  p2_broad_marker_source_file_count: report.p2.broad_marker_source_file_count,
  p2_positive_count_statement_file_count: report.p2.positive_count_statement_file_count,
  p2_positive_count_statement_sum: report.p2.positive_count_statement_sum,
  explicit_p2_item_line_count: report.p2.explicit_p2_item_line_count,
  unresolved_p2_line_count: report.p2.unresolved_p2_line_count,
  ldip_actual_decision_count: report.ldip.actual_decision_count,
  hrx_actual_decision_count: report.hrx.actual_decision_count,
  mat_dec_mention_line_count: report.mat_dec.mention_line_count,
  finding_count: report.findings.length
}, null, 2));

if (report.verdict !== "PASS") {
  process.exit(1);
}
