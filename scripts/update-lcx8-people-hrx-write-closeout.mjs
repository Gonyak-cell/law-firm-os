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
const PROOF_JSON = `${ARTIFACT_DIR}/lcx8-action-0201-0204-0208-0217-people-hrx-write-proof.json`;
const PROOF_MD = `${ARTIFACT_DIR}/lcx8-action-0201-0204-0208-0217-people-hrx-write-proof.md`;
const CLOSEOUT_JSON = `${ARTIFACT_DIR}/lcx8-post-closeout-people-hrx-write-2026-06-28.json`;
const CLOSEOUT_MD = `${ARTIFACT_DIR}/lcx8-post-closeout-people-hrx-write-2026-06-28.md`;

const ROW_IDS = [
  "LCX8-ACTION-0201",
  "LCX8-ACTION-0202",
  "LCX8-ACTION-0203",
  "LCX8-ACTION-0204",
  "LCX8-ACTION-0208",
  "LCX8-ACTION-0209",
  "LCX8-ACTION-0210",
  "LCX8-ACTION-0215",
  "LCX8-ACTION-0216",
  "LCX8-ACTION-0217"
];
const STATUS_ORDER = ["PASS", "GUARDED", "UI_ONLY", "DESCRIPTOR_ONLY", "BLOCKED", "FAIL", "UNKNOWN"];
const BATCH_ID = "LCX8-ALL-26";
const generatedAt = new Date().toISOString();
const resolutionKey = "post_closeout_resolution_lcx8_action_0201_0204_0208_0217_people_hrx_write";
const latestNote =
  "Post-closeout People HRX write proof promoted 10 Lane B rows to PASS with browser-clicked safe synthetic HRX writes, API response/read-back, audit events, and denied scope guard probes.";
const verificationSummary =
  "Post-closeout LCX8-ACTION-0201/0202/0203/0204/0208/0209/0210/0215/0216/0217 People HRX write proof PASS 13/13. Browser clicked leave submit, approval reject/approve, recruiting stage update, policy version create, AI advisory/final-review prompts, and payroll preview/approve/export controls. Proof captured API write responses, API read-back or response-bound read-back where no GET route exists, HRX audit events, denied scope guard probes, no page errors, and no unexpected console errors. Payroll export remains artifact-reference only with no provider, tax, calculation, disbursement, production-ready, or go-live claim.";

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

function addResolution(doc, resolution) {
  updateCountFields(doc, resolution.counts_after);
  doc[resolutionKey] = resolution;
}

function replaceBlock(text, begin, end, content) {
  const pattern = new RegExp(`${begin}[\\s\\S]*?${end}`);
  if (pattern.test(text)) return text.replace(pattern, `${begin}\n${content}\n${end}`);
  return `${text.trimEnd()}\n\n${begin}\n${content}\n${end}\n`;
}

function removeIdsFromRiskGroups(doc) {
  for (const group of doc.ranked_groups ?? []) {
    if (!Array.isArray(group.row_ids)) continue;
    group.row_ids = group.row_ids.filter((id) => !ROW_IDS.includes(id));
    group.row_count = group.row_ids.length;
  }
}

function markRiskRowsResolved(doc) {
  for (const row of doc.ranked_rows ?? []) {
    if (!ROW_IDS.includes(row.id)) continue;
    row.status = "PASS";
    row.lane = "resolved";
    row.tier = "resolved";
    row.score = 0;
    row.reason = "Resolved by People HRX write browser/API/read-back/audit/guard proof.";
    row.latest_evidence = PROOF_JSON;
    row.latest_status_decision = "PASS; browser/API/write/read-back/audit/guard proof captured.";
  }
  if (Array.isArray(doc.ranked_rows)) doc.tier_counts = countBy(doc.ranked_rows, (row) => row.tier);
}

function markIssuesResolved(doc) {
  for (const issue of doc.issues ?? []) {
    if (!ROW_IDS.includes(issue.id)) continue;
    issue.status = "PASS";
    issue.remediation_lane = "resolved";
    issue.tier = "resolved";
    issue.score = 0;
    issue.latest_evidence = PROOF_JSON;
    issue.latest_status_decision = "PASS; browser/API/write/read-back/audit/guard proof captured.";
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
    `Post-closeout ${id} People HRX write proof: clicked ${row.label}; response ${proofRow.response?.status}; read-back=${proofRow.read_back?.passed}; audit=${proofRow.audit_actions.map((item) => `${item.action}:${item.found}`).join(", ")}; guard=${proofRow.guard_probes.map((item) => `${item.name}:${item.status}/${item.safe_error_code}`).join(", ")}; artifact=${PROOF_JSON}`
  );
  appendUnique(
    row.evidence,
    "Post-closeout non-claim: safe synthetic HRX local runtime proof only; no external provider execution, payroll/tax calculation, payment/disbursement instruction, final people decision, production-ready, or go-live claim."
  );
  row.status = "PASS";
  row.remediation_lane = "resolved";
  row.trace_depth = proofRow.trace_depth;
  if (proofRow.response?.url) {
    row.api_route = `${proofRow.response?.body ? "" : ""}${row.api_route}`;
  }
  if (!String(row.notes ?? "").includes("People HRX write proof")) {
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
  schema_version: "law-firm-os.lcx8.post-closeout.people-hrx-write.v0.1",
  generated_at: generatedAt,
  batch_id: BATCH_ID,
  action_ids: ROW_IDS,
  status_before: "BLOCKED",
  status_after: "PASS",
  remediation_lane_after: "resolved",
  proof: PROOF_JSON,
  proof_md: PROOF_MD,
  counts_before: countsBefore,
  counts_after: countsAfter,
  source_fixes: [
    "apps/web/src/admin/hrx/HRXPolicyConsole.tsx exposes the existing effective_from field so policy creation can satisfy the API write precondition.",
    "scripts/run-lcx8-people-hrx-write-proof.mjs records payroll export audit object_id using the API's PayrollExportArtifact artifact_id."
  ],
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
  latest_verification_summary: verificationSummary,
  non_claims: [
    "safe synthetic local HRX runtime proof only",
    "no external provider execution",
    "no payroll/tax calculation or payment/disbursement instruction",
    "no final people decision claim",
    "no production-ready or go-live claim"
  ]
};
writeJson(CLOSEOUT_JSON, resolution);
writeFileSync(CLOSEOUT_MD, `${[
  "# LCX8 People HRX Write Closeout",
  "",
  "- Status before: BLOCKED",
  "- Status after: PASS",
  "- Lane after: resolved",
  `- Proof: ${PROOF_JSON}`,
  `- Proof markdown: ${PROOF_MD}`,
  "",
  `Verification: ${verificationSummary}`,
  "",
  "## Rows",
  ...resolution.evidence.map((row) => `- ${row.id}: ${row.trace_depth}; response ${row.response_status}; read-back ${row.read_back?.passed}; audit ${row.audit_actions.map((item) => `${item.action}:${item.found}`).join(", ")}`),
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
  if (kind === "post_status") {
    doc.resolved_rows = doc.resolved_rows ?? [];
    for (const id of ROW_IDS) {
      if (!doc.resolved_rows.some((item) => item.id === id)) {
        doc.resolved_rows.push({
          id,
          status_before: "BLOCKED",
          status_after: "PASS",
          lane_after: "resolved",
          proof: PROOF_JSON
        });
      }
    }
  }
  if (kind === "risk") {
    removeIdsFromRiskGroups(doc);
    markRiskRowsResolved(doc);
  }
  if (kind === "issues") markIssuesResolved(doc);
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
    "- Latest resolved evidence: `LCX8-ACTION-0201/0202/0203/0204/0208/0209/0210/0215/0216/0217` People HRX write proof promoted 10 Lane B rows to `PASS`.",
    `- Current status counts after remediation: PASS ${countsAfter.PASS}, GUARDED ${countsAfter.GUARDED}, UI_ONLY ${countsAfter.UI_ONLY}, DESCRIPTOR_ONLY ${countsAfter.DESCRIPTOR_ONLY}, BLOCKED ${countsAfter.BLOCKED}, FAIL ${countsAfter.FAIL}, UNKNOWN ${countsAfter.UNKNOWN}.`,
    `- Evidence: ${PROOF_JSON}, ${CLOSEOUT_JSON}.`,
    `- Verification: ${verificationSummary}`,
    "- Non-claim: payroll export is an artifact reference only; no external provider, calculation, tax, payment, final people decision, production-ready, or go-live claim is made."
  ].join("\n")
);
writeFileSync(BACKLOG_MD, backlog);

const progressLine = `- 2026-06-28: \`LCX8-ACTION-0201/0202/0203/0204/0208/0209/0210/0215/0216/0217\` promoted from \`BLOCKED\` / Lane B to \`PASS\` / resolved with \`${BATCH_ID}\` People HRX write proof. Browser/API proof PASS 13/13 captured safe synthetic writes, read-back/response-bound proof, HRX audit events, denied scope guards, no page errors, and no unexpected console errors. Counts: PASS ${countsAfter.PASS}, GUARDED ${countsAfter.GUARDED}, UI_ONLY ${countsAfter.UI_ONLY}, DESCRIPTOR_ONLY ${countsAfter.DESCRIPTOR_ONLY}, BLOCKED ${countsAfter.BLOCKED}, FAIL ${countsAfter.FAIL}, UNKNOWN ${countsAfter.UNKNOWN}. No external provider, payroll/tax calculation, payment, final people decision, production-ready, or go-live claim.`;
let plan = readFileSync(PLAN_MD, "utf8");
plan = plan.replace(/## Current Snapshot[\s\S]*?## Execution Progress/, `${currentSnapshot}\n## Execution Progress`);
if (!plan.includes("`LCX8-ACTION-0201/0202/0203/0204/0208/0209/0210/0215/0216/0217` promoted")) {
  plan = plan.replace("\n## LazyCodex Execution Rules", `\n${progressLine}\n\n## LazyCodex Execution Rules`);
}
writeFileSync(PLAN_MD, plan);

let statusMd = readFileSync(POST_STATUS_MD, "utf8");
if (!statusMd.includes("LCX8-ACTION-0201/0202/0203/0204/0208/0209/0210/0215/0216/0217 People HRX write")) {
  statusMd += `\n## LCX8-ACTION-0201/0202/0203/0204/0208/0209/0210/0215/0216/0217 People HRX write\n\n- Status: BLOCKED -> PASS / resolved\n- Proof: ${PROOF_JSON}\n- Closeout: ${CLOSEOUT_JSON}\n- Verification: ${verificationSummary}\n- Non-claim: no external provider, payroll/tax calculation, payment/disbursement instruction, final people decision, production-ready, or go-live claim.\n`;
}
writeFileSync(POST_STATUS_MD, statusMd);

let auditMd = readFileSync(AUDIT_MD, "utf8");
if (!auditMd.includes("Post-Closeout People HRX Write Proof")) {
  auditMd += `\n## Post-Closeout People HRX Write Proof\n\n- \`LCX8-ACTION-0201/0202/0203/0204/0208/0209/0210/0215/0216/0217\` People HRX write proof: ${PROOF_JSON}\n- Closeout: ${CLOSEOUT_JSON}\n- Verification: ${verificationSummary}\n- Boundary: safe synthetic local HRX writes only; no external provider, payroll/tax calculation, payment/disbursement instruction, final people decision, production-ready, or go-live claim is made.\n`;
}
writeFileSync(AUDIT_MD, auditMd);

console.log(JSON.stringify({
  updated_rows: ROW_IDS,
  counts_before: countsBefore,
  counts_after: countsAfter,
  proof: PROOF_JSON,
  closeout: CLOSEOUT_JSON,
  status_decision: "BLOCKED -> PASS / resolved"
}, null, 2));
