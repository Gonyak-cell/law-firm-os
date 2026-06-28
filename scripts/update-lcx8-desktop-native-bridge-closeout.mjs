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
const PROOF_JSON = `${ARTIFACT_DIR}/lcx8-action-0247-0256-0257-0261-desktop-native-bridge-proof.json`;
const PROOF_MD = `${ARTIFACT_DIR}/lcx8-action-0247-0256-0257-0261-desktop-native-bridge-proof.md`;
const CLOSEOUT_JSON = `${ARTIFACT_DIR}/lcx8-post-closeout-desktop-native-bridge-2026-06-28.json`;
const CLOSEOUT_MD = `${ARTIFACT_DIR}/lcx8-post-closeout-desktop-native-bridge-2026-06-28.md`;

const ROW_IDS = [
  "LCX8-ACTION-0247",
  "LCX8-ACTION-0256",
  "LCX8-ACTION-0257",
  "LCX8-ACTION-0261"
];
const STATUS_ORDER = ["PASS", "GUARDED", "UI_ONLY", "DESCRIPTOR_ONLY", "BLOCKED", "FAIL", "UNKNOWN"];
const BATCH_ID = "LCX8-ALL-28";
const generatedAt = new Date().toISOString();
const resolutionKey = "post_closeout_blocker_evidence_lcx8_action_0247_0256_0257_0261_desktop_native_bridge";
const verificationSummary =
  "Post-closeout LCX8-ACTION-0247/0256/0257/0261 desktop native bridge proof PASS. Desktop file bridge suite PASS 17/17 plus contract validators PASS; desktop smoke PASS 59/59. Source proof confirms active shell loads session.cjs and exposes matterSession only; fileBridge.js/materFileBridge and tempPreview manager exist and test cleanly but are not loaded/registered by active product shell. Status remains BLOCKED/Lane B pending visible shell trigger and active preload/IPC integration.";
const latestNote =
  "Post-closeout desktop native bridge blocker evidence captured: file bridge/temp preview implementations and desktop smoke tests pass, but active product shell still loads session.cjs only and does not expose/register fileBridge or tempPreview native bridges. Status remains BLOCKED/Lane B.";

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

const proof = readJson(PROOF_JSON);
if (proof.result !== "PASS") throw new Error(`Expected ${PROOF_JSON} PASS, got ${proof.result}`);
for (const id of ROW_IDS) {
  const row = proof.rowProofs?.find((item) => item.id === id);
  if (!row || !String(row.status_decision).includes("BLOCKED remains BLOCKED")) {
    throw new Error(`Expected ${id} BLOCKED remains BLOCKED in proof`);
  }
}

const ledger = readJson(LEDGER_JSON);
const rows = ledger.rows ?? ledger.actions;
const rowMap = new Map(rows.map((row) => [row.id, row]));
const countsBefore = statusCounts(rows);

for (const id of ROW_IDS) {
  const row = rowMap.get(id);
  if (!row) throw new Error(`Missing ledger row ${id}`);
  const proofRow = proof.rowProofs.find((item) => item.id === id);
  appendUnique(
    row.evidence,
    `Post-closeout ${id} desktop native bridge blocker proof: ${proofRow.observed}; missing runtime receipt=${proofRow.missing_runtime_receipt}; artifact=${PROOF_JSON}`
  );
  appendUnique(
    row.evidence,
    "Post-closeout non-claim: desktop unit/contract proof only; no active file bridge preload, visible product trigger, OS file dialog receipt, production-ready, public release, or go-live claim."
  );
  row.status = "BLOCKED";
  row.remediation_lane = "Lane B";
  row.trace_depth = "native_bridge";
  if (!String(row.notes ?? "").includes("desktop native bridge blocker evidence")) {
    row.notes = `${row.notes ?? ""} ${latestNote}`.trim();
  }
}

const countsAfter = statusCounts(rows);
if (JSON.stringify(countsAfter) !== JSON.stringify(countsBefore)) {
  throw new Error(`Desktop native bridge blocker update must not change counts: before=${JSON.stringify(countsBefore)} after=${JSON.stringify(countsAfter)}`);
}

updateCountFields(ledger, countsAfter);
ledger.coverage = {
  ...(ledger.coverage ?? {}),
  inventory_rows: rows.length,
  unknown_rows: countsAfter.UNKNOWN,
  latest_post_closeout_batch: BATCH_ID,
  latest_blocker_evidence_rows: ROW_IDS
};
writeJson(LEDGER_JSON, ledger);

const csvLines = readFileSync(LEDGER_CSV, "utf8").trimEnd().split("\n");
const nextCsvLines = csvLines.map((line) => {
  const id = line.split(",", 1)[0];
  return rowMap.has(id) ? rowToCsv(rowMap.get(id)) : line;
});
writeFileSync(LEDGER_CSV, `${nextCsvLines.join("\n")}\n`);

const resolution = {
  schema_version: "law-firm-os.lcx8.post-closeout.desktop-native-bridge.v0.1",
  generated_at: generatedAt,
  batch_id: BATCH_ID,
  action_ids: ROW_IDS,
  status_before: "BLOCKED",
  status_after: "BLOCKED",
  remediation_lane_after: "Lane B",
  status_decision: "BLOCKED remains BLOCKED / Lane B",
  reason: "active_product_shell_native_bridge_integration_required",
  proof: PROOF_JSON,
  proof_md: PROOF_MD,
  counts_before: countsBefore,
  counts_after: countsAfter,
  evidence: proof.rowProofs.map((row) => ({
    id: row.id,
    observed: row.observed,
    missing_runtime_receipt: row.missing_runtime_receipt
  })),
  tests: proof.tests.map((test) => ({
    command: test.command,
    summary: test.summary
  })),
  latest_verification_summary: verificationSummary,
  non_claims: proof.non_claims
};
writeJson(CLOSEOUT_JSON, resolution);
writeFileSync(CLOSEOUT_MD, `${[
  "# LCX8 Desktop Native Bridge Blocker Closeout",
  "",
  "- Status before: BLOCKED",
  "- Status after: BLOCKED",
  "- Lane: Lane B",
  "- Reason: active_product_shell_native_bridge_integration_required",
  `- Proof: ${PROOF_JSON}`,
  `- Proof markdown: ${PROOF_MD}`,
  "",
  `Verification: ${verificationSummary}`,
  "",
  "## Rows",
  ...resolution.evidence.map((row) => `- ${row.id}: ${row.observed}; missing=${row.missing_runtime_receipt}`),
  "",
  "## Non-Claims",
  ...resolution.non_claims.map((item) => `- ${item}`)
].join("\n")}\n`);

for (const path of [ACTION_RUN, POST_STATUS_JSON, FINAL_LANE_JSON, RISK_JSON, ISSUES_JSON]) {
  const doc = readJson(path);
  addResolution(doc, resolution);
  if (path === RISK_JSON) {
    for (const row of doc.ranked_rows ?? []) {
      if (ROW_IDS.includes(recordId(row))) {
        row.latest_evidence = PROOF_JSON;
        row.latest_status_decision = "BLOCKED remains BLOCKED / Lane B; active product shell preload/IPC integration still required.";
      }
    }
  }
  if (path === ISSUES_JSON) {
    for (const issue of doc.issues ?? []) {
      if (ROW_IDS.includes(recordId(issue))) {
        issue.latest_evidence = PROOF_JSON;
        issue.latest_status_decision = "BLOCKED remains BLOCKED / Lane B; active product shell preload/IPC integration still required.";
      }
    }
  }
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
    "- Latest blocker evidence: `LCX8-ACTION-0247/0256/0257/0261` desktop native bridge proof captured; status remains `BLOCKED` / `Lane B`.",
    `- Current status counts after remediation: PASS ${countsAfter.PASS}, GUARDED ${countsAfter.GUARDED}, UI_ONLY ${countsAfter.UI_ONLY}, DESCRIPTOR_ONLY ${countsAfter.DESCRIPTOR_ONLY}, BLOCKED ${countsAfter.BLOCKED}, FAIL ${countsAfter.FAIL}, UNKNOWN ${countsAfter.UNKNOWN}.`,
    `- Evidence: ${PROOF_JSON}, ${CLOSEOUT_JSON}.`,
    `- Verification: ${verificationSummary}`,
    "- Non-claim: implementation/contract tests pass, but active product shell native preload/IPC integration and visible file dialog/temp-preview trigger remain unproven."
  ].join("\n")
);
writeFileSync(BACKLOG_MD, backlog);

const progressLine = `- 2026-06-28: \`LCX8-ACTION-0247/0256/0257/0261\` remain \`BLOCKED\` / Lane B with \`${BATCH_ID}\` desktop native bridge blocker proof. File bridge suite PASS 17/17 plus validators PASS; desktop smoke PASS 59/59. Source proof confirms active shell loads \`session.cjs\` and exposes \`matterSession\` only; \`fileBridge.js\`/\`materFileBridge\` and temp preview manager are implemented/tested but not loaded or registered by the active product shell. Counts unchanged: PASS ${countsAfter.PASS}, GUARDED ${countsAfter.GUARDED}, UI_ONLY ${countsAfter.UI_ONLY}, DESCRIPTOR_ONLY ${countsAfter.DESCRIPTOR_ONLY}, BLOCKED ${countsAfter.BLOCKED}, FAIL ${countsAfter.FAIL}, UNKNOWN ${countsAfter.UNKNOWN}.`;
let plan = readFileSync(PLAN_MD, "utf8");
plan = plan.replace(/## Current Snapshot[\s\S]*?## Execution Progress/, `${currentSnapshot}\n## Execution Progress`);
if (!plan.includes("`LCX8-ACTION-0247/0256/0257/0261` remain `BLOCKED`")) {
  plan = plan.replace("\n## LazyCodex Execution Rules", `\n${progressLine}\n\n## LazyCodex Execution Rules`);
}
writeFileSync(PLAN_MD, plan);

let statusMd = readFileSync(POST_STATUS_MD, "utf8");
if (!statusMd.includes("LCX8-ACTION-0247/0256/0257/0261 Desktop native bridge")) {
  statusMd += `\n## LCX8-ACTION-0247/0256/0257/0261 Desktop native bridge\n\n- Status: BLOCKED remains BLOCKED / Lane B\n- Proof: ${PROOF_JSON}\n- Closeout: ${CLOSEOUT_JSON}\n- Verification: ${verificationSummary}\n- Non-claim: no active product shell file bridge preload/IPC integration, visible trigger, OS file dialog receipt, production-ready, public release, or go-live claim.\n`;
}
writeFileSync(POST_STATUS_MD, statusMd);

let auditMd = readFileSync(AUDIT_MD, "utf8");
if (!auditMd.includes("Post-Closeout Desktop Native Bridge Blocker Proof")) {
  auditMd += `\n## Post-Closeout Desktop Native Bridge Blocker Proof\n\n- \`LCX8-ACTION-0247/0256/0257/0261\` desktop native bridge blocker proof: ${PROOF_JSON}\n- Closeout: ${CLOSEOUT_JSON}\n- Verification: ${verificationSummary}\n- Boundary: status remains \`BLOCKED\` / Lane B; active product shell native preload/IPC integration and visible OS file dialog/temp-preview trigger are still unproven.\n`;
}
writeFileSync(AUDIT_MD, auditMd);

console.log(JSON.stringify({
  updated_rows: ROW_IDS,
  counts_before: countsBefore,
  counts_after: countsAfter,
  proof: PROOF_JSON,
  closeout: CLOSEOUT_JSON,
  status_decision: "BLOCKED remains BLOCKED / Lane B"
}, null, 2));
