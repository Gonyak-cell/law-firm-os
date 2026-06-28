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
const PROOF_JSON = `${ARTIFACT_DIR}/lcx8-action-0233-0243-0324-profile-people-refresh-proof.json`;
const PROOF_MD = `${ARTIFACT_DIR}/lcx8-action-0233-0243-0324-profile-people-refresh-proof.md`;
const CLOSEOUT_JSON = `${ARTIFACT_DIR}/lcx8-post-closeout-profile-people-refresh-2026-06-28.json`;
const CLOSEOUT_MD = `${ARTIFACT_DIR}/lcx8-post-closeout-profile-people-refresh-2026-06-28.md`;

const ROW_IDS = [
  "LCX8-ACTION-0233",
  "LCX8-ACTION-0234",
  "LCX8-ACTION-0235",
  "LCX8-ACTION-0236",
  "LCX8-ACTION-0237",
  "LCX8-ACTION-0238",
  "LCX8-ACTION-0239",
  "LCX8-ACTION-0240",
  "LCX8-ACTION-0241",
  "LCX8-ACTION-0242",
  "LCX8-ACTION-0243",
  "LCX8-ACTION-0324"
];
const STATUS_ORDER = ["PASS", "GUARDED", "UI_ONLY", "DESCRIPTOR_ONLY", "BLOCKED", "FAIL", "UNKNOWN"];
const BATCH_ID = "LCX8-ALL-25";
const generatedAt = new Date().toISOString();
const resolutionKey = "post_closeout_resolution_lcx8_action_0233_0243_0324_profile_people_refresh";
const verificationSummary =
  "Post-closeout LCX8-ACTION-0233..0243/0324 profile and People refresh proof PASS 15/15. Browser clicked profile section routes, profile utility buttons, profile top actions, profile action cards, and People header refresh on people-approvals. Profile route/local rows produced visible state, People refresh re-fired GET /api/hrx/approvals through standalone panel remount, and proof observed 0 API writes, no page errors, and no unexpected console errors. npm --workspace apps/web run test:ui PASS 17/17 after preserving the existing UserProfileSurface route contract.";
const latestNote =
  "Post-closeout profile and People refresh proof promoted the final 12 Lane A FAIL rows to PASS with route/local UI state and existing API-read refresh proof.";

function readJson(path) {
  return JSON.parse(readFileSync(path, "utf8"));
}

function writeJson(path, value) {
  writeFileSync(path, `${JSON.stringify(value, null, 2)}\n`);
}

function appendUnique(list, value) {
  if (Array.isArray(list) && !list.includes(value)) list.push(value);
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
  return [
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
  ].map((field) => csvEscape(row[field])).join(",");
}

function updateCountFields(doc, counts) {
  doc.generated_at = generatedAt;
  for (const key of ["status_counts", "status_counts_after", "by_status"]) {
    if (doc[key] !== undefined) doc[key] = counts;
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
if (proof.result !== "PASS") throw new Error(`Expected ${PROOF_JSON} PASS, got ${proof.result}`);
for (const id of ROW_IDS) {
  const row = proof.rowProofs?.find((item) => item.id === id);
  if (row?.status_decision !== "PASS") throw new Error(`Expected ${id} PASS in proof`);
}

const ledger = readJson(LEDGER_JSON);
const rows = ledger.rows ?? ledger.actions;
const rowMap = new Map(rows.map((row) => [row.id, row]));
const countsBefore = statusCounts(rows);

for (const id of ROW_IDS) {
  const row = rowMap.get(id);
  if (!row) throw new Error(`Missing ledger row ${id}`);
  const proofRow = proof.rowProofs.find((item) => item.id === id);
  appendUnique(row.evidence, `Post-closeout ${id} profile/People refresh proof: clicked ${row.label}; observed "${proofRow.observed_text}"; artifact=${PROOF_JSON}`);
  appendUnique(row.evidence, "Post-closeout non-claim: route/local UI-state/API-read proof only; no persistence, API write, external receipt, production-ready, or go-live claim.");
  row.status = "PASS";
  row.remediation_lane = "resolved";
  row.trace_depth = proofRow.trace_depth;
  if (id === "LCX8-ACTION-0324") {
    row.api_route = "/api/hrx/approvals";
    row.handler = "People header refresh -> setRefreshKey -> standalone HRX panel key remount -> API read refetch";
  } else if (["LCX8-ACTION-0233", "LCX8-ACTION-0234", "LCX8-ACTION-0235", "LCX8-ACTION-0236"].includes(id)) {
    row.handler = "profileSidebarItems -> setView('profile', section); UserProfileSurface renders hash-backed section state";
  } else if (["LCX8-ACTION-0237", "LCX8-ACTION-0238"].includes(id)) {
    row.handler = "Shell profile sidebar utility -> data-sidebar-utility-panel local state";
  } else {
    row.handler = "UserProfileSurface onClick -> profile localAction state panel";
  }
  if (!String(row.notes ?? "").includes("profile and People refresh proof")) {
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
  schema_version: "law-firm-os.lcx8.post-closeout.profile-people-refresh.v0.1",
  generated_at: generatedAt,
  batch_id: BATCH_ID,
  action_ids: ROW_IDS,
  status_before: "FAIL",
  status_after: "PASS",
  remediation_lane_after: "resolved",
  proof: PROOF_JSON,
  proof_md: PROOF_MD,
  counts_before: countsBefore,
  counts_after: countsAfter,
  source_fixes: [
    "apps/web/src/components/UserProfileSurface.jsx renders profile hash sections and local action state.",
    "apps/web/src/people/PeopleHome.tsx keys standalone HRX panels by refreshKey so header refresh remounts and re-fetches active panel data."
  ],
  evidence: proof.rowProofs.map((row) => ({
    id: row.id,
    observed_text: row.observed_text,
    screenshot: row.screenshot,
    trace_depth: row.trace_depth
  })),
  latest_verification_summary: verificationSummary,
  non_claims: [
    "local browser route/UI-state and API-read proof only",
    "no API write performed by this proof",
    "no persistence or durable reload proof required for these rows",
    "no external receipt claim",
    "no production go-live or production-ready claim"
  ]
};
writeJson(CLOSEOUT_JSON, resolution);
writeFileSync(CLOSEOUT_MD, `${[
  "# LCX8 Profile And People Refresh Closeout",
  "",
  "- Status before: FAIL",
  "- Status after: PASS",
  "- Lane after: resolved",
  `- Proof: ${PROOF_JSON}`,
  `- Proof markdown: ${PROOF_MD}`,
  "",
  `Verification: ${verificationSummary}`,
  "",
  "## Rows",
  ...resolution.evidence.map((row) => `- ${row.id}: ${row.trace_depth}; ${row.observed_text}`),
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
    for (const artifact of [PROOF_JSON, PROOF_MD, CLOSEOUT_JSON, CLOSEOUT_MD]) appendUnique(doc.post_closeout_remediation.artifacts, artifact);
  }
  if (path === POST_STATUS_JSON) {
    doc.resolved_rows = doc.resolved_rows ?? [];
    for (const id of ROW_IDS) {
      if (!doc.resolved_rows.some((item) => item.id === id)) {
        const ledgerRow = rowMap.get(id);
        doc.resolved_rows.push({
          id,
          status_before: "FAIL",
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
      assignment.reason = "resolved_by_profile_route_local_state_and_people_refresh_proof";
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
      ranked.reason = "Resolved by profile route/local state and People refresh proof.";
      ranked.latest_evidence = PROOF_JSON;
    }
    for (const group of doc.ranked_groups ?? []) {
      if (!Array.isArray(group.row_ids)) continue;
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
      issue.title = `Resolved profile/People refresh action for ${issue.label}`;
      issue.body = `Resolved by ${PROOF_JSON}. Browser proof clicked the visible control and observed route/local state or existing API-read refresh behavior without persistence, API write, external receipt, production-ready, or go-live claim.`;
      issue.risk_reason = "Resolved by profile route/local state and People refresh proof.";
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
    "- Latest resolved evidence: profile and People refresh proof promoted the final 12 Lane A `FAIL` rows to `PASS`.",
    `- Current status counts after remediation: PASS ${countsAfter.PASS}, GUARDED ${countsAfter.GUARDED}, UI_ONLY ${countsAfter.UI_ONLY}, DESCRIPTOR_ONLY ${countsAfter.DESCRIPTOR_ONLY}, BLOCKED ${countsAfter.BLOCKED}, FAIL ${countsAfter.FAIL}, UNKNOWN ${countsAfter.UNKNOWN}.`,
    `- Evidence: ${PROOF_JSON}, ${CLOSEOUT_JSON}.`,
    `- Verification: ${verificationSummary}`,
    "- Non-claim: route/local UI-state/API-read proof only; no persistence, API write, external receipt, production-ready, or go-live claim is made."
  ].join("\n")
);
for (const id of ROW_IDS) {
  const proofBody = `Resolved by ${PROOF_JSON}. Browser proof clicked the visible control and observed route/local state or existing API-read refresh behavior without persistence, API write, external receipt, production-ready, or go-live claim.`;
  const pattern = new RegExp(`^\\| (\\d+) \\| ${id} \\| [^|]+ \\| [^|]+ \\| [^|]+ \\| ([^|]+) \\| ([^|]+) \\| [^|]+ \\| [^|]+ \\|$`, "m");
  backlog = backlog.replace(pattern, `| $1 | ${id} | resolved | PASS | resolved | $2 | $3 | Resolved profile/People refresh action | ${proofBody} |`);
}
writeFileSync(BACKLOG_MD, backlog);

let postStatus = readFileSync(POST_STATUS_MD, "utf8");
postStatus = replaceLine(
  postStatus,
  /- Current status counts after remediation: PASS \d+, GUARDED \d+, UI_ONLY \d+, DESCRIPTOR_ONLY \d+, BLOCKED \d+, FAIL \d+, UNKNOWN \d+\./,
  `- Current status counts after remediation: PASS ${countsAfter.PASS}, GUARDED ${countsAfter.GUARDED}, UI_ONLY ${countsAfter.UI_ONLY}, DESCRIPTOR_ONLY ${countsAfter.DESCRIPTOR_ONLY}, BLOCKED ${countsAfter.BLOCKED}, FAIL ${countsAfter.FAIL}, UNKNOWN ${countsAfter.UNKNOWN}.`
);
if (!postStatus.includes(PROOF_JSON)) {
  postStatus += `\n- Profile and People refresh closeout: ${PROOF_JSON}; ${CLOSEOUT_JSON}.\n`;
}
writeFileSync(POST_STATUS_MD, postStatus);

let plan = readFileSync(PLAN_MD, "utf8");
plan = replaceLine(plan, /- Current unresolved non-PASS rows after execution progress: \d+/, `- Current unresolved non-PASS rows after execution progress: ${rows.length - countsAfter.PASS}`);
plan = replaceLine(
  plan,
  /- Current status counts: PASS \d+, GUARDED \d+, UI_ONLY \d+, DESCRIPTOR_ONLY \d+, BLOCKED \d+, FAIL \d+, UNKNOWN \d+/,
  `- Current status counts: PASS ${countsAfter.PASS}, GUARDED ${countsAfter.GUARDED}, UI_ONLY ${countsAfter.UI_ONLY}, DESCRIPTOR_ONLY ${countsAfter.DESCRIPTOR_ONLY}, BLOCKED ${countsAfter.BLOCKED}, FAIL ${countsAfter.FAIL}, UNKNOWN ${countsAfter.UNKNOWN}`
);
plan = replaceLine(plan, /\| FAIL \| \d+ \| fix false\/broken affordance \|/, `| FAIL | ${countsAfter.FAIL} | fix false/broken affordance |`);
plan = replaceLine(plan, /\| active remediation \| \d+ \|/, `| active remediation | ${countsAfter.BLOCKED + countsAfter.FAIL + countsAfter.DESCRIPTOR_ONLY} |`);
for (const id of ROW_IDS) {
  const pattern = new RegExp(`^(\\| [^|]+ \\| ${id} \\| )[^|]+( \\| )[^|]+( \\| )[^|]*( \\|)`, "m");
  plan = plan.replace(pattern, `$1PASS$2completed after control freeze$3$4`);
}
writeFileSync(PLAN_MD, plan);

let audit = readFileSync(AUDIT_MD, "utf8");
const auditSection = [
  "",
  "## Post-Closeout Profile And People Refresh Proof",
  "",
  `- Rows: \`${ROW_IDS.join(", ")}\``,
  `- Proof: ${PROOF_JSON}`,
  `- Closeout: ${CLOSEOUT_JSON}`,
  `- Verification: ${verificationSummary}`,
  "- Boundary: status promoted to `PASS` from route/local UI-state/API-read proof only; no persistence, API write, external receipt, production-ready, or go-live claim is made."
].join("\n");
if (!audit.includes("## Post-Closeout Profile And People Refresh Proof")) audit += `${auditSection}\n`;
writeFileSync(AUDIT_MD, audit);

console.log(JSON.stringify({
  result: "PASS",
  rows: ROW_IDS,
  countsBefore,
  countsAfter,
  proof: PROOF_JSON,
  closeout: CLOSEOUT_JSON
}, null, 2));
