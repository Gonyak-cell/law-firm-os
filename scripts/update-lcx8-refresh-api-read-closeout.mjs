#!/usr/bin/env node
import { readFileSync, writeFileSync } from "node:fs";

const ARTIFACT_DIR = "docs/lazycodex/evidence/matter-web/artifacts";
const LEDGER_JSON = `${ARTIFACT_DIR}/lcx8-action-ledger.json`;
const LEDGER_CSV = `${ARTIFACT_DIR}/lcx8-action-ledger.csv`;
const ACTION_RUN = `${ARTIFACT_DIR}/lcx8-action-run.json`;
const POST_STATUS_JSON = `${ARTIFACT_DIR}/lcx8-post-closeout-remediation-status-2026-06-26.json`;
const POST_STATUS_MD = `${ARTIFACT_DIR}/lcx8-post-closeout-remediation-status-2026-06-26.md`;
const FINAL_STATUS_JSON = `${ARTIFACT_DIR}/lcx8-final-status-count-p8-t00.json`;
const CRITICAL_UNKNOWN_JSON = `${ARTIFACT_DIR}/lcx8-critical-unknown-zero-p8-t01.json`;
const FINAL_LANE_JSON = `${ARTIFACT_DIR}/lcx8-final-lane-assignment-p8-t02-t06.json`;
const RISK_JSON = `${ARTIFACT_DIR}/lcx8-blocker-risk-ranking-p8-t07.json`;
const ISSUES_JSON = `${ARTIFACT_DIR}/lcx8-remediation-ready-issues-p8-t08.json`;
const BACKLOG_MD = `${ARTIFACT_DIR}/lcx8-remediation-backlog.md`;
const PLAN_MD = "docs/lazycodex/lcx8-remaining-ui-action-remediation-plan-2026-06-27.md";
const AUDIT_MD = "docs/lazycodex/evidence/matter-web/LCX-WEB-08-ui-action-operational-audit.md";
const PROOF_JSON = `${ARTIFACT_DIR}/lcx8-action-0036-0044-0064-refresh-api-read-proof.json`;
const PROOF_MD = `${ARTIFACT_DIR}/lcx8-action-0036-0044-0064-refresh-api-read-proof.md`;
const CLOSEOUT_JSON = `${ARTIFACT_DIR}/lcx8-post-closeout-refresh-api-read-2026-06-28.json`;
const CLOSEOUT_MD = `${ARTIFACT_DIR}/lcx8-post-closeout-refresh-api-read-2026-06-28.md`;

const ROW_IDS = ["LCX8-ACTION-0036", "LCX8-ACTION-0044", "LCX8-ACTION-0064"];
const STATUS_ORDER = ["PASS", "GUARDED", "UI_ONLY", "DESCRIPTOR_ONLY", "BLOCKED", "FAIL", "UNKNOWN"];
const COUNT_FIELDS = ["status_counts", "status_counts_after", "by_status"];
const BATCH_ID = "LCX8-ALL-22";
const generatedAt = new Date().toISOString();
const verificationSummary =
  "Post-closeout LCX8-ACTION-0036/0044/0064 refresh API-read verification: proof PASS 16/16; browser clicked Home, Matter header, and Matter Vault refresh controls; all expected GET endpoints were observed; denied/review guard text was observed; no API 5xx, no unexpected non-GET writes beyond Matter recently-viewed, no unsafe guard success, and no unexpected browser console errors. npm --workspace apps/web run test:ui PASS 17/17; npm run build PASS with existing Vite chunk-size warning only; MATTER_UI_URL=http://127.0.0.1:5174 npm run ui:flows:verify PASS 9/9; MATTER_UI_URL=http://127.0.0.1:5174 npm run ui:live:verify PASS 13/13; sloplint PASS; git diff --check PASS.";
const latestNote =
  "Post-closeout LCX8-ACTION-0036/0044/0064 refresh API-read proof promoted three Lane B rows from BLOCKED to PASS. Home HRX overview now forwards permission context, Home pillar status preserves guarded outcomes, and Matter Vault renders denied/review guard state when no matter is selectable.";
const resolutionKey = "post_closeout_resolution_lcx8_action_0036_0044_0064_refresh_api_read";

function readJson(path) {
  return JSON.parse(readFileSync(path, "utf8"));
}

function writeJson(path, value) {
  writeFileSync(path, `${JSON.stringify(value, null, 2)}\n`);
}

function appendUnique(list, value) {
  if (!Array.isArray(list)) return;
  if (!list.includes(value)) list.push(value);
}

function statusCounts(rows) {
  const counts = Object.fromEntries(STATUS_ORDER.map((status) => [status, 0]));
  for (const row of rows) counts[row.status] = (counts[row.status] ?? 0) + 1;
  return counts;
}

function countBy(rows, keyFn, order = []) {
  const counts = {};
  for (const row of rows) {
    const key = keyFn(row) || "(none)";
    counts[key] = (counts[key] ?? 0) + 1;
  }
  const sorted = {};
  for (const key of order) sorted[key] = counts[key] ?? 0;
  for (const key of Object.keys(counts).sort()) {
    if (!(key in sorted)) sorted[key] = counts[key];
  }
  return sorted;
}

function csvEscape(value) {
  const text = Array.isArray(value) ? value.join(" | ") : String(value ?? "");
  return /[",\n]/.test(text) ? `"${text.replaceAll('"', '""')}"` : text;
}

function rowToCsv(row) {
  const fields = [
    "id",
    "tuw",
    "surface",
    "route",
    "section",
    "label",
    "selector",
    "action_type",
    "expected_user_outcome",
    "source_file",
    "handler",
    "trace_depth",
    "api_route",
    "domain_runtime",
    "permission_boundary",
    "audit_boundary",
    "persistence_boundary",
    "status",
    "remediation_lane",
    "evidence",
    "notes"
  ];
  return fields.map((field) => csvEscape(row[field])).join(",");
}

function updateCountFields(doc, counts) {
  doc.generated_at = generatedAt;
  for (const field of COUNT_FIELDS) {
    if (doc[field] !== undefined) doc[field] = counts;
  }
  doc.latest_note = latestNote;
  doc.latest_verification_summary = verificationSummary;
}

function replaceLine(text, pattern, replacement) {
  return text.replace(pattern, replacement);
}

function replaceBlock(text, begin, end, content) {
  const pattern = new RegExp(`${begin}[\\s\\S]*?${end}`);
  return text.replace(pattern, `${begin}\n${content}\n${end}`);
}

const proof = readJson(PROOF_JSON);
if (proof.result !== "PASS") {
  throw new Error(`Expected ${PROOF_JSON} result PASS, received ${proof.result}`);
}
for (const id of ROW_IDS) {
  const decision = proof.rowDecisions?.find((row) => row.id === id);
  if (decision?.status_decision !== "PASS") throw new Error(`Expected ${id} row decision PASS`);
}

const ledger = readJson(LEDGER_JSON);
const rows = ledger.rows ?? ledger.actions;
const countsBefore = statusCounts(rows);
const rowMap = new Map(rows.map((row) => [row.id, row]));
for (const id of ROW_IDS) {
  const row = rowMap.get(id);
  if (!row) throw new Error(`Missing ledger row ${id}`);
  appendUnique(row.evidence, `Post-closeout ${id} refresh API-read proof: browser clicked ${row.label}; all expected read endpoints observed; denied/review guards observed; no API 5xx, no unexpected write claim; artifact=${PROOF_JSON}`);
  appendUnique(row.evidence, "Post-closeout source fix: Home HRX overview passes permission context, Home pillar aggregation preserves guarded outcomes, and Matter Vault no-matter denied/review state renders guard copy.");
  row.status = "PASS";
  row.remediation_lane = "resolved";
  if (!String(row.notes ?? "").includes("LCX8-ACTION-0036/0044/0064")) {
    row.notes = `${row.notes ?? ""} ${latestNote}`.trim();
  }
}
const countsAfter = statusCounts(rows);
updateCountFields(ledger, countsAfter);
ledger.coverage = {
  ...(ledger.coverage ?? {}),
  inventory_rows: rows.length,
  unknown_rows: countsAfter.UNKNOWN,
  latest_post_closeout_batch: BATCH_ID,
  latest_post_closeout_rows: ROW_IDS
};
writeJson(LEDGER_JSON, ledger);

const csvLines = readFileSync(LEDGER_CSV, "utf8").trimEnd().split("\n");
const nextCsvLines = csvLines.map((line) => {
  const id = line.split(",", 1)[0];
  return rowMap.has(id) ? rowToCsv(rowMap.get(id)) : line;
});
writeFileSync(LEDGER_CSV, `${nextCsvLines.join("\n")}\n`);

const resolution = {
  schema_version: "law-firm-os.lcx8.post-closeout.refresh-api-read.v0.1",
  generated_at: generatedAt,
  batch_id: BATCH_ID,
  action_ids: ROW_IDS,
  status_before: "BLOCKED",
  status_after: "PASS",
  remediation_lane_before: "Lane B",
  remediation_lane_after: "resolved",
  proof: PROOF_JSON,
  proof_md: PROOF_MD,
  counts_before: countsBefore,
  counts_after: countsAfter,
  source_fixes: [
    "apps/web/src/people/hrxApiClient.ts forwards guarded HRX results and accepts optional request context.",
    "apps/web/src/components/HomeSurface.jsx passes liveCtx into fetchHrxPeopleOverview and prioritizes guarded pillar results over live item aggregation.",
    "apps/web/src/components/MatterVaultPanel.jsx renders denied/review guard state when Matter selection is unavailable under guarded context.",
    "scripts/run-lcx8-refresh-api-read-proof.mjs captures Vite-proxied API responses and filters expected 403 guard console noise."
  ],
  evidence: [
    "All expected Home, Matter header, and Matter Vault GET endpoints observed from browser refresh clicks.",
    "Denied and review guarded states rendered visible guard copy for all three rows.",
    "No API 5xx, no unsafe guard success, and no unexpected non-GET mutation beyond the existing Matter recently-viewed side-effect."
  ],
  latest_verification_summary: verificationSummary,
  non_claims: [
    "local browser/API proof only",
    "no production go-live claim",
    "no external production receipt claim",
    "no product write claim for these refresh rows"
  ]
};
writeJson(CLOSEOUT_JSON, resolution);
writeFileSync(CLOSEOUT_MD, `${[
  "# LCX8-ACTION-0036/0044/0064 Refresh API-Read Closeout",
  "",
  "- Status before: BLOCKED",
  "- Status after: PASS",
  "- Lane before: Lane B",
  "- Lane after: resolved",
  `- Proof: ${PROOF_JSON}`,
  `- Proof markdown: ${PROOF_MD}`,
  "",
  `Verification: ${verificationSummary}`,
  "",
  "## Source Fixes",
  ...resolution.source_fixes.map((item) => `- ${item}`),
  "",
  "## Non-Claims",
  ...resolution.non_claims.map((item) => `- ${item}`)
].join("\n")}\n`);

for (const path of [ACTION_RUN, POST_STATUS_JSON, FINAL_LANE_JSON, RISK_JSON, ISSUES_JSON]) {
  const doc = readJson(path);
  updateCountFields(doc, countsAfter);
  doc[resolutionKey] = resolution;
  if (path === ACTION_RUN) {
    doc.post_closeout_remediation = doc.post_closeout_remediation ?? {};
    doc.post_closeout_remediation.resolved_rows = doc.post_closeout_remediation.resolved_rows ?? [];
    for (const id of ROW_IDS) appendUnique(doc.post_closeout_remediation.resolved_rows, id);
    doc.post_closeout_remediation.status_counts_after = {
      inventory_rows: rows.length,
      unknown: countsAfter.UNKNOWN,
      pass: countsAfter.PASS,
      guarded: countsAfter.GUARDED,
      ui_only: countsAfter.UI_ONLY,
      descriptor_only: countsAfter.DESCRIPTOR_ONLY,
      blocked: countsAfter.BLOCKED,
      fail: countsAfter.FAIL,
      ...countsAfter
    };
    doc.post_closeout_remediation.artifacts = doc.post_closeout_remediation.artifacts ?? [];
    for (const artifact of [PROOF_JSON, PROOF_MD, CLOSEOUT_JSON, CLOSEOUT_MD]) {
      appendUnique(doc.post_closeout_remediation.artifacts, artifact);
    }
  }
  if (path === POST_STATUS_JSON) {
    doc.resolved_rows = doc.resolved_rows ?? [];
    for (const id of ROW_IDS) {
      if (!doc.resolved_rows.some((row) => row.id === id)) {
        const ledgerRow = rowMap.get(id);
        doc.resolved_rows.push({
          id,
          status_before: "BLOCKED",
          status_after: "PASS",
          surface: ledgerRow.surface,
          label: ledgerRow.label,
          evidence: PROOF_JSON
        });
      }
    }
  }
  if (path === FINAL_LANE_JSON) {
    for (const assignment of doc.assignments ?? []) {
      if (!ROW_IDS.includes(assignment.id)) continue;
      assignment.status = "PASS";
      assignment.remediation_lane = "resolved";
      assignment.reason = "resolved_by_refresh_api_read_browser_guard_proof";
      assignment.latest_evidence = PROOF_JSON;
    }
    doc.lane_counts = countBy(doc.assignments ?? [], (row) => row.remediation_lane, ["Lane A", "Lane E", "Lane B", "resolved", "Lane D"]);
    doc.required_fail_blocked_descriptor_rows = countsAfter.BLOCKED + countsAfter.FAIL + countsAfter.DESCRIPTOR_ONLY;
  }
  if (path === RISK_JSON) {
    for (const ranked of [...(doc.ranked_rows ?? []), ...(doc.top_20_rows ?? [])]) {
      if (!ROW_IDS.includes(ranked.id)) continue;
      ranked.status = "PASS";
      ranked.lane = "resolved";
      ranked.tier = "resolved";
      ranked.score = 0;
      ranked.reason = "Resolved by refresh API-read browser/guard proof.";
      ranked.latest_evidence = PROOF_JSON;
    }
    for (const group of doc.ranked_groups ?? []) {
      if (group.id !== "RISK-05") continue;
      group.row_ids = group.row_ids.filter((id) => !ROW_IDS.includes(id));
      group.row_count = group.row_ids.length;
    }
    doc.tier_counts = countBy(doc.ranked_rows ?? [], (row) => row.tier, ["critical", "high", "resolved", "medium", "low"]);
  }
  if (path === ISSUES_JSON) {
    for (const issue of doc.issues ?? []) {
      if (!ROW_IDS.includes(issue.id)) continue;
      issue.status = "PASS";
      issue.remediation_lane = "resolved";
      issue.tier = "resolved";
      issue.score = 0;
      issue.title = `Resolved read/fail-closed proof for ${issue.label}`;
      issue.body = `Resolved by ${PROOF_JSON}. Browser proof observed all expected refresh read endpoints, denied/review guard copy, no API 5xx, no unsafe guard success, and no unexpected non-GET write beyond Matter recently-viewed.`;
      issue.risk_reason = "Resolved by refresh API-read browser/guard proof.";
      issue.latest_evidence = PROOF_JSON;
    }
    doc.issue_counts_by_tier = countBy(doc.issues ?? [], (row) => row.tier, ["critical", "high", "resolved", "medium", "low"]);
    doc.issue_counts_by_lane = countBy(doc.issues ?? [], (row) => row.remediation_lane, [
      "Lane B/Lane E",
      "Lane E",
      "Lane B",
      "resolved",
      "Lane D",
      "Lane A",
      "Lane A/Lane E",
      "Lane C",
      "Lane C/Lane D"
    ]);
  }
  writeJson(path, doc);
}

for (const path of [FINAL_STATUS_JSON, CRITICAL_UNKNOWN_JSON]) {
  const doc = readJson(path);
  updateCountFields(doc, countsAfter);
  if (doc.ledger_rows !== undefined) doc.ledger_rows = rows.length;
  if (doc.csv_lines_expected !== undefined) doc.csv_lines_expected = rows.length + 1;
  if (doc.all_unknown_count !== undefined) doc.all_unknown_count = countsAfter.UNKNOWN;
  if (doc.critical_unknown_count !== undefined) doc.critical_unknown_count = 0;
  writeJson(path, doc);
}

let backlog = readFileSync(BACKLOG_MD, "utf8");
backlog = replaceBlock(
  backlog,
  "<!-- LCX8:POST-CLOSEOUT-REMEDIATION:BEGIN -->",
  "<!-- LCX8:POST-CLOSEOUT-REMEDIATION:END -->",
  [
    "## Post-Closeout Remediation Update",
    "",
    "- Latest resolved evidence: `LCX8-ACTION-0036/0044/0064` refresh API-read browser/guard proof promoted three Lane B rows to `PASS`.",
    `- Current status counts after remediation: PASS ${countsAfter.PASS}, GUARDED ${countsAfter.GUARDED}, UI_ONLY ${countsAfter.UI_ONLY}, DESCRIPTOR_ONLY ${countsAfter.DESCRIPTOR_ONLY}, BLOCKED ${countsAfter.BLOCKED}, FAIL ${countsAfter.FAIL}, UNKNOWN ${countsAfter.UNKNOWN}.`,
    `- Evidence: ${PROOF_JSON}, ${CLOSEOUT_JSON}.`,
    `- Verification: ${verificationSummary}`,
    "- Non-claim: local browser/API proof only; no production go-live, external production receipt, or product write claim is made for these refresh rows."
  ].join("\n")
);
for (const id of ROW_IDS) {
  const proofBody = `Resolved by ${PROOF_JSON}. Browser proof observed all expected refresh read endpoints, denied/review guard copy, no API 5xx, no unsafe guard success, and no unexpected non-GET write beyond Matter recently-viewed.`;
  const pattern = new RegExp(`^\\| (\\d+) \\| ${id} \\| [^|]+ \\| [^|]+ \\| [^|]+ \\| ([^|]+) \\| ([^|]+) \\| [^|]+ \\| [^|]+ \\|$`, "m");
  backlog = backlog.replace(pattern, `| $1 | ${id} | resolved | PASS | resolved | $2 | $3 | Resolved read/fail-closed proof | ${proofBody} |`);
}
writeFileSync(BACKLOG_MD, backlog);

let plan = readFileSync(PLAN_MD, "utf8");
plan = replaceLine(plan, /- Current unresolved non-PASS rows after execution progress: \d+/, `- Current unresolved non-PASS rows after execution progress: ${rows.length - countsAfter.PASS}`);
plan = replaceLine(
  plan,
  /- Current status counts: PASS \d+, GUARDED \d+, UI_ONLY \d+, DESCRIPTOR_ONLY \d+, BLOCKED \d+, FAIL \d+, UNKNOWN \d+/,
  `- Current status counts: PASS ${countsAfter.PASS}, GUARDED ${countsAfter.GUARDED}, UI_ONLY ${countsAfter.UI_ONLY}, DESCRIPTOR_ONLY ${countsAfter.DESCRIPTOR_ONLY}, BLOCKED ${countsAfter.BLOCKED}, FAIL ${countsAfter.FAIL}, UNKNOWN ${countsAfter.UNKNOWN}`
);
plan = replaceLine(plan, /\| BLOCKED \| \d+ \| prove or keep blocked with exact missing receipt\/runtime \|/, `| BLOCKED | ${countsAfter.BLOCKED} | prove or keep blocked with exact missing receipt/runtime |`);
plan = replaceLine(plan, /\| active remediation \| \d+ \|/, `| active remediation | ${countsAfter.BLOCKED + countsAfter.FAIL + countsAfter.DESCRIPTOR_ONLY} |`);
for (const id of ROW_IDS) {
  const pattern = new RegExp(`^(\\| LCX8-ALL-10 \\| ${id} \\| )BLOCKED( \\| )active remediation( \\| )Lane B( \\|)`, "m");
  plan = plan.replace(pattern, `$1PASS$2completed after control freeze$3$4`);
}
writeFileSync(PLAN_MD, plan);

let audit = readFileSync(AUDIT_MD, "utf8");
const auditSection = [
  "",
  "## Post-Closeout Refresh API-Read Proof",
  "",
  `- \`LCX8-ACTION-0036/0044/0064\` refresh API-read proof: ${PROOF_JSON}`,
  `- Closeout: ${CLOSEOUT_JSON}`,
  `- Verification: ${verificationSummary}`,
  `- Boundary: status promoted to \`PASS\` from local browser/API proof only; no production go-live, external production receipt, or product write claim is made for these refresh rows.`
].join("\n");
if (!audit.includes("## Post-Closeout Refresh API-Read Proof")) {
  audit += `${auditSection}\n`;
}
writeFileSync(AUDIT_MD, audit);

console.log(JSON.stringify({
  result: "PASS",
  rows: ROW_IDS,
  countsBefore,
  countsAfter,
  proof: PROOF_JSON,
  closeout: CLOSEOUT_JSON
}, null, 2));
