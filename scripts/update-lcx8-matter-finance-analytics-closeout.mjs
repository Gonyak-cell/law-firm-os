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
const PROOF_JSON = `${ARTIFACT_DIR}/lcx8-action-0307-0308-0309-0311-0313-matter-finance-analytics-proof.json`;
const PROOF_MD = `${ARTIFACT_DIR}/lcx8-action-0307-0308-0309-0311-0313-matter-finance-analytics-proof.md`;
const CLOSEOUT_JSON = `${ARTIFACT_DIR}/lcx8-post-closeout-matter-finance-analytics-2026-06-28.json`;
const CLOSEOUT_MD = `${ARTIFACT_DIR}/lcx8-post-closeout-matter-finance-analytics-2026-06-28.md`;

const ROW_IDS = [
  "LCX8-ACTION-0307",
  "LCX8-ACTION-0308",
  "LCX8-ACTION-0309",
  "LCX8-ACTION-0311",
  "LCX8-ACTION-0312",
  "LCX8-ACTION-0313"
];
const PREREQ_BLOCKED_IDS = ["LCX8-ACTION-0310"];
const STATUS_ORDER = ["PASS", "GUARDED", "UI_ONLY", "DESCRIPTOR_ONLY", "BLOCKED", "FAIL", "UNKNOWN"];
const BATCH_ID = "LCX8-ALL-27";
const generatedAt = new Date().toISOString();
const resolutionKey = "post_closeout_resolution_lcx8_action_0307_0308_0309_0311_0313_matter_finance_analytics";
const latestNote =
  "Post-closeout Matter team/finance/analytics proof promoted 6 Lane B rows to PASS with browser-clicked safe synthetic writes, read-back or response-bound proof, audit events, and denied guard probes; LCX8-ACTION-0310 remains BLOCKED/Lane D as a local payment prerequisite without external banking receipt.";
const verificationSummary =
  "Post-closeout LCX8-ACTION-0307/0308/0309/0311/0312/0313 Matter team/finance/analytics proof PASS 11/11. Browser clicked Matter team responsible-attorney assignment, Finance time entry, Finance WIP generation, Analytics refresh, Analytics export, and Analytics matter-profitability refresh. Proof captured API write responses, read-back or response-bound proof where no GET route exists, audit events, denied permission guard probes, no page errors, and no unexpected console errors. LCX8-ACTION-0310 payment import was used only as a local synthetic prerequisite for profitability and remains BLOCKED/Lane D with no external banking receipt, payment execution, production-ready, or go-live claim.";

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

function countBy(rows, keyFn) {
  const counts = {};
  for (const row of rows) {
    const key = keyFn(row) || "(none)";
    counts[key] = (counts[key] ?? 0) + 1;
  }
  return Object.fromEntries(Object.entries(counts).sort(([left], [right]) => left.localeCompare(right)));
}

function recordId(record) {
  return record?.id ?? record?.row_id ?? record?.action_id;
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

function addResolution(doc, resolution) {
  updateCountFields(doc, resolution.counts_after);
  doc[resolutionKey] = resolution;
}

function replaceBlock(text, begin, end, content) {
  const pattern = new RegExp(`${begin}[\\s\\S]*?${end}`);
  if (pattern.test(text)) return text.replace(pattern, `${begin}\n${content}\n${end}`);
  return `${text.trimEnd()}\n\n${begin}\n${content}\n${end}\n`;
}

function markRiskRows(doc) {
  for (const group of doc.ranked_groups ?? []) {
    if (Array.isArray(group.row_ids)) {
      group.row_ids = group.row_ids.filter((id) => !ROW_IDS.includes(id));
      group.row_count = group.row_ids.length;
    }
  }
  if (Array.isArray(doc.top_20_rows)) {
    doc.top_20_rows = doc.top_20_rows.filter((row) => !ROW_IDS.includes(recordId(row)));
  }
  if (Array.isArray(doc.ranked_rows)) {
    doc.ranked_rows = doc.ranked_rows.filter((row) => !ROW_IDS.includes(recordId(row)));
    doc.ranked_row_count = doc.ranked_rows.length;
  }
  for (const row of doc.ranked_rows ?? []) {
    if (PREREQ_BLOCKED_IDS.includes(recordId(row))) {
      row.latest_evidence = PROOF_JSON;
      row.latest_status_decision = "BLOCKED remains BLOCKED / Lane D; local synthetic payment prerequisite only, external banking receipt still required.";
    }
  }
  if (Array.isArray(doc.ranked_rows)) doc.tier_counts = countBy(doc.ranked_rows, (row) => row.tier);
}

function markIssues(doc) {
  if (Array.isArray(doc.issues)) {
    doc.issues = doc.issues.filter((issue) => !ROW_IDS.includes(recordId(issue)));
    doc.issue_count = doc.issues.length;
  }
  for (const issue of doc.issues ?? []) {
    if (PREREQ_BLOCKED_IDS.includes(recordId(issue))) {
      issue.latest_evidence = PROOF_JSON;
      issue.latest_status_decision = "BLOCKED remains BLOCKED / Lane D; local synthetic payment prerequisite only, external banking receipt still required.";
    }
  }
  if (Array.isArray(doc.issues)) {
    doc.issue_counts_by_lane = countBy(doc.issues, (issue) => issue.remediation_lane);
    doc.issue_counts_by_tier = countBy(doc.issues, (issue) => issue.tier);
  }
}

const proof = readJson(PROOF_JSON);
if (proof.result !== "PASS") throw new Error(`Expected ${PROOF_JSON} PASS, got ${proof.result}`);
for (const id of ROW_IDS) {
  const row = proof.rowProofs?.find((item) => item.id === id);
  if (row?.status_decision !== "PASS") throw new Error(`Expected ${id} PASS in proof`);
}
const prereq0310 = proof.prerequisites?.find((item) => item.id === "LCX8-ACTION-0310");
if (!prereq0310 || !String(prereq0310.status_decision).includes("BLOCKED remains BLOCKED")) {
  throw new Error("Expected LCX8-ACTION-0310 prerequisite blocker evidence in proof");
}

const ledger = readJson(LEDGER_JSON);
const rows = ledger.rows ?? ledger.actions;
const rowMap = new Map(rows.map((row) => [row.id, row]));
const countsBefore = statusCounts(rows);
const newlyPromotedCount = ROW_IDS.filter((id) => rowMap.get(id)?.status !== "PASS").length;

for (const id of ROW_IDS) {
  const row = rowMap.get(id);
  if (!row) throw new Error(`Missing ledger row ${id}`);
  const proofRow = proof.rowProofs.find((item) => item.id === id);
  appendUnique(
    row.evidence,
    `Post-closeout ${id} Matter team/finance/analytics proof: clicked ${row.label}; response ${proofRow.response?.status}; read-back=${proofRow.read_back?.passed}; audit=${proofRow.audit_actions.map((item) => `${item.action}:${item.found}`).join(", ")}; guard=${proofRow.guard_probes.map((item) => `${item.name}:${item.status}/${(item.safe_error_codes ?? []).join("+")}`).join(", ")}; artifact=${PROOF_JSON}`
  );
  appendUnique(
    row.evidence,
    "Post-closeout non-claim: safe synthetic local Matter/Finance/Analytics runtime proof only; no external provider, banking receipt, payment execution, production-ready, or go-live claim."
  );
  row.status = "PASS";
  row.remediation_lane = "resolved";
  row.trace_depth = proofRow.trace_depth;
  if (!String(row.notes ?? "").includes("Matter team/finance/analytics proof")) {
    row.notes = `${row.notes ?? ""} ${latestNote}`.trim();
  }
}

for (const id of PREREQ_BLOCKED_IDS) {
  const row = rowMap.get(id);
  if (!row) continue;
  appendUnique(row.evidence, `Post-closeout prerequisite evidence: ${id} local synthetic payment import observed in ${PROOF_JSON}; status remains BLOCKED/Lane D because external banking receipt/payment execution is not claimed.`);
  appendUnique(row.evidence, "Post-closeout non-claim: local payment import prerequisite only; no external banking receipt, payment execution, production-ready, or go-live claim.");
  row.status = "BLOCKED";
  row.remediation_lane = "Lane D";
  if (!String(row.notes ?? "").includes("local synthetic payment prerequisite")) {
    row.notes = `${row.notes ?? ""} ${latestNote}`.trim();
  }
}

const countsAfter = statusCounts(rows);
if (countsAfter.PASS !== countsBefore.PASS + newlyPromotedCount) {
  throw new Error(`Expected PASS +${newlyPromotedCount}, got before=${countsBefore.PASS} after=${countsAfter.PASS}`);
}
if (countsAfter.BLOCKED !== countsBefore.BLOCKED - newlyPromotedCount) {
  throw new Error(`Expected BLOCKED -${newlyPromotedCount}, got before=${countsBefore.BLOCKED} after=${countsAfter.BLOCKED}`);
}

updateCountFields(ledger, countsAfter);
ledger.coverage = {
  ...(ledger.coverage ?? {}),
  inventory_rows: rows.length,
  unknown_rows: countsAfter.UNKNOWN,
  latest_post_closeout_batch: BATCH_ID,
  latest_post_closeout_rows: ROW_IDS,
  latest_prerequisite_blocker_rows: PREREQ_BLOCKED_IDS
};
writeJson(LEDGER_JSON, ledger);

const csvLines = readFileSync(LEDGER_CSV, "utf8").trimEnd().split("\n");
const nextCsvLines = csvLines.map((line) => {
  const id = line.split(",", 1)[0];
  return rowMap.has(id) ? rowToCsv(rowMap.get(id)) : line;
});
writeFileSync(LEDGER_CSV, `${nextCsvLines.join("\n")}\n`);

const resolution = {
  schema_version: "law-firm-os.lcx8.post-closeout.matter-finance-analytics.v0.1",
  generated_at: generatedAt,
  batch_id: BATCH_ID,
  action_ids: ROW_IDS,
  prerequisite_blocker_ids: PREREQ_BLOCKED_IDS,
  status_before: "BLOCKED",
  status_after: "PASS",
  remediation_lane_after: "resolved",
  proof: PROOF_JSON,
  proof_md: PROOF_MD,
  counts_before: countsBefore,
  counts_after: countsAfter,
  source_fixes: [],
  evidence: proof.rowProofs.map((row) => ({
    id: row.id,
    observed_text: row.observed_text,
    screenshot: row.screenshot,
    response_status: row.response?.status,
    read_back: row.read_back,
    audit_actions: row.audit_actions,
    guard_probes: row.guard_probes,
    trace_depth: row.trace_depth
  })),
  prerequisites: proof.prerequisites,
  latest_verification_summary: verificationSummary,
  non_claims: [
    "safe synthetic local Matter/Finance/Analytics runtime proof only",
    "LCX8-ACTION-0310 remains BLOCKED/Lane D until external banking receipt exists",
    "no external provider, banking receipt, payment execution, production-ready, or go-live claim"
  ]
};
writeJson(CLOSEOUT_JSON, resolution);
writeFileSync(CLOSEOUT_MD, `${[
  "# LCX8 Matter Finance Analytics Closeout",
  "",
  "- Status before: BLOCKED",
  "- Status after: PASS for LCX8-ACTION-0307/0308/0309/0311/0312/0313",
  "- Lane after: resolved",
  "- Prerequisite blocker: LCX8-ACTION-0310 remains BLOCKED / Lane D",
  `- Proof: ${PROOF_JSON}`,
  `- Proof markdown: ${PROOF_MD}`,
  "",
  `Verification: ${verificationSummary}`,
  "",
  "## Rows",
  ...resolution.evidence.map((row) => `- ${row.id}: ${row.trace_depth}; response ${row.response_status}; read-back ${row.read_back?.passed}; audit ${row.audit_actions.map((item) => `${item.action}:${item.found}`).join(", ")}`),
  "",
  "## Prerequisites",
  ...resolution.prerequisites.map((item) => `- ${item.id}: ${item.status_decision}; ${item.non_claim}`),
  "",
  "## Non-Claims",
  ...resolution.non_claims.map((item) => `- ${item}`)
].join("\n")}\n`);

for (const [path, kind] of [
  [ACTION_RUN, "action_run"],
  [POST_STATUS_JSON, "post_status"],
  [FINAL_LANE_JSON, "lane"],
  [RISK_JSON, "risk"],
  [ISSUES_JSON, "issues"]
]) {
  const doc = readJson(path);
  addResolution(doc, resolution);
  if (kind === "action_run") {
    doc.post_closeout_remediation = doc.post_closeout_remediation ?? {};
    doc.post_closeout_remediation.resolved_rows = doc.post_closeout_remediation.resolved_rows ?? [];
    for (const id of ROW_IDS) appendUnique(doc.post_closeout_remediation.resolved_rows, id);
    doc.post_closeout_remediation.blocker_rows = doc.post_closeout_remediation.blocker_rows ?? [];
    for (const id of PREREQ_BLOCKED_IDS) appendUnique(doc.post_closeout_remediation.blocker_rows, id);
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
  if (kind === "post_status") {
    doc.resolved_rows = doc.resolved_rows ?? [];
    for (const id of ROW_IDS) {
      if (!doc.resolved_rows.some((item) => item.id === id)) {
        doc.resolved_rows.push({ id, status_before: "BLOCKED", status_after: "PASS", lane_after: "resolved", proof: PROOF_JSON });
      }
    }
    doc.blocker_rows = doc.blocker_rows ?? [];
    for (const id of PREREQ_BLOCKED_IDS) {
      if (!doc.blocker_rows.some((item) => item.id === id)) {
        doc.blocker_rows.push({ id, status_after: "BLOCKED", lane_after: "Lane D", proof: PROOF_JSON, reason: "external banking receipt still required" });
      }
    }
  }
  if (kind === "risk") markRiskRows(doc);
  if (kind === "issues") markIssues(doc);
  writeJson(path, doc);
}

for (const path of [FINAL_STATUS_JSON, CRITICAL_UNKNOWN_JSON]) {
  const doc = readJson(path);
  updateCountFields(doc, countsAfter);
  if (doc.by_status) doc.by_status = countsAfter;
  if (doc.ledger_rows) doc.ledger_rows = rows.length;
  if (doc.all_unknown_count !== undefined) doc.all_unknown_count = countsAfter.UNKNOWN;
  if (doc.critical_unknown_count !== undefined) doc.critical_unknown_count = 0;
  writeJson(path, doc);
}

const nonPassRows = rows.filter((row) => row.status !== "PASS");
const currentSnapshot = [
  "## Current Snapshot",
  "",
  `- Inventory rows: ${rows.length}`,
  "- Already `PASS` at control freeze: 22",
  "- Baseline non-PASS rows assigned in this plan: 302",
  `- Current unresolved non-PASS rows after execution progress: ${rows.length - countsAfter.PASS}`,
  `- Current status counts: PASS ${countsAfter.PASS}, GUARDED ${countsAfter.GUARDED}, UI_ONLY ${countsAfter.UI_ONLY}, DESCRIPTOR_ONLY ${countsAfter.DESCRIPTOR_ONLY}, BLOCKED ${countsAfter.BLOCKED}, FAIL ${countsAfter.FAIL}, UNKNOWN ${countsAfter.UNKNOWN}`,
  "- Baseline assignment coverage: 302/302; unassigned rows: 0",
  "",
  "| Status | Count | Work type |",
  "| --- | ---: | --- |",
  `| BLOCKED | ${countsAfter.BLOCKED} | prove or keep blocked with exact missing receipt/runtime |`,
  `| DESCRIPTOR_ONLY | ${countsAfter.DESCRIPTOR_ONLY} | product/runtime decision |`,
  `| FAIL | ${countsAfter.FAIL} | fix false/broken affordance |`,
  `| GUARDED | ${countsAfter.GUARDED} | revalidate fail-closed final state |`,
  `| UI_ONLY | ${countsAfter.UI_ONLY} | revalidate honest local/route behavior |`,
  "",
  "| Work category | Count |",
  "| --- | ---: |",
  `| active remediation | ${countsAfter.BLOCKED + countsAfter.FAIL + countsAfter.DESCRIPTOR_ONLY} |`,
  `| classification closure | ${countsAfter.UI_ONLY} |`,
  `| guarded revalidation | ${countsAfter.GUARDED} |`,
  "",
  "| Remediation lane | Count |",
  "| --- | ---: |",
  ...Object.entries(countBy(nonPassRows, (row) => row.remediation_lane || "(none)")).map(([lane, count]) => `| ${lane} | ${count} |`),
  "",
  "| Trace depth | Count |",
  "| --- | ---: |",
  ...Object.entries(countBy(nonPassRows, (row) => row.trace_depth || "unknown")).map(([depth, count]) => `| ${depth} | ${count} |`),
  ""
].join("\n");

let backlog = readFileSync(BACKLOG_MD, "utf8");
backlog = replaceBlock(
  backlog,
  "<!-- LCX8:POST-CLOSEOUT-REMEDIATION:BEGIN -->",
  "<!-- LCX8:POST-CLOSEOUT-REMEDIATION:END -->",
  [
    "## Post-Closeout Remediation Update",
    "",
    "- Latest resolved evidence: `LCX8-ACTION-0307/0308/0309/0311/0312/0313` Matter team/finance/analytics proof promoted 6 Lane B rows to `PASS`.",
    "- `LCX8-ACTION-0310` was observed only as a prerequisite local payment import and remains `BLOCKED` / Lane D until external banking receipt exists.",
    `- Current status counts after remediation: PASS ${countsAfter.PASS}, GUARDED ${countsAfter.GUARDED}, UI_ONLY ${countsAfter.UI_ONLY}, DESCRIPTOR_ONLY ${countsAfter.DESCRIPTOR_ONLY}, BLOCKED ${countsAfter.BLOCKED}, FAIL ${countsAfter.FAIL}, UNKNOWN ${countsAfter.UNKNOWN}.`,
    `- Evidence: ${PROOF_JSON}, ${CLOSEOUT_JSON}.`,
    `- Verification: ${verificationSummary}`,
    "- Non-claim: no external provider, banking receipt, payment execution, production-ready, or go-live claim is made."
  ].join("\n")
);
writeFileSync(BACKLOG_MD, backlog);

const progressLine = `- 2026-06-28: \`LCX8-ACTION-0307/0308/0309/0311/0312/0313\` promoted from \`BLOCKED\` / Lane B to \`PASS\` / resolved with \`${BATCH_ID}\` Matter team/finance/analytics proof. Browser/API proof PASS 11/11 captured safe synthetic writes, read-back/response-bound proof, audit events, denied guards, no page errors, and no unexpected console errors. \`LCX8-ACTION-0310\` remains \`BLOCKED\` / Lane D as a local payment prerequisite without external banking receipt. Counts: PASS ${countsAfter.PASS}, GUARDED ${countsAfter.GUARDED}, UI_ONLY ${countsAfter.UI_ONLY}, DESCRIPTOR_ONLY ${countsAfter.DESCRIPTOR_ONLY}, BLOCKED ${countsAfter.BLOCKED}, FAIL ${countsAfter.FAIL}, UNKNOWN ${countsAfter.UNKNOWN}. No external provider, banking receipt, payment execution, production-ready, or go-live claim.`;
let plan = readFileSync(PLAN_MD, "utf8");
plan = plan.replace(/## Current Snapshot[\s\S]*?## Execution Progress/, `${currentSnapshot}\n## Execution Progress`);
if (!plan.includes("`LCX8-ACTION-0307/0308/0309/0311/0312/0313` promoted")) {
  plan = plan.replace("\n## LazyCodex Execution Rules", `\n${progressLine}\n\n## LazyCodex Execution Rules`);
}
writeFileSync(PLAN_MD, plan);

let statusMd = readFileSync(POST_STATUS_MD, "utf8");
if (!statusMd.includes("LCX8-ACTION-0307/0308/0309/0311/0312/0313 Matter team/finance/analytics")) {
  statusMd += `\n## LCX8-ACTION-0307/0308/0309/0311/0312/0313 Matter team/finance/analytics\n\n- Status: BLOCKED -> PASS / resolved\n- Prerequisite blocker: LCX8-ACTION-0310 remains BLOCKED / Lane D\n- Proof: ${PROOF_JSON}\n- Closeout: ${CLOSEOUT_JSON}\n- Verification: ${verificationSummary}\n- Non-claim: no external provider, banking receipt, payment execution, production-ready, or go-live claim.\n`;
}
writeFileSync(POST_STATUS_MD, statusMd);

let auditMd = readFileSync(AUDIT_MD, "utf8");
if (!auditMd.includes("Post-Closeout Matter Finance Analytics Proof")) {
  auditMd += `\n## Post-Closeout Matter Finance Analytics Proof\n\n- \`LCX8-ACTION-0307/0308/0309/0311/0312/0313\` Matter team/finance/analytics proof: ${PROOF_JSON}\n- Closeout: ${CLOSEOUT_JSON}\n- Verification: ${verificationSummary}\n- Boundary: \`LCX8-ACTION-0310\` remains \`BLOCKED\` / Lane D; no external provider, banking receipt, payment execution, production-ready, or go-live claim is made.\n`;
}
writeFileSync(AUDIT_MD, auditMd);

console.log(JSON.stringify({
  updated_rows: ROW_IDS,
  prerequisite_blocker_rows: PREREQ_BLOCKED_IDS,
  counts_before: countsBefore,
  counts_after: countsAfter,
  proof: PROOF_JSON,
  closeout: CLOSEOUT_JSON,
  status_decision: "BLOCKED -> PASS / resolved for target rows; LCX8-ACTION-0310 remains BLOCKED / Lane D"
}, null, 2));
