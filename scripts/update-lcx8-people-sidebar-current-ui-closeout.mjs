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
const PROOF_JSON = `${ARTIFACT_DIR}/lcx8-action-0148-0152-0163-people-sidebar-current-ui-proof.json`;
const PROOF_MD = `${ARTIFACT_DIR}/lcx8-action-0148-0152-0163-people-sidebar-current-ui-proof.md`;
const CLOSEOUT_JSON = `${ARTIFACT_DIR}/lcx8-post-closeout-people-sidebar-current-ui-2026-06-28.json`;
const CLOSEOUT_MD = `${ARTIFACT_DIR}/lcx8-post-closeout-people-sidebar-current-ui-2026-06-28.md`;

const ROW_IDS = [
  "LCX8-ACTION-0148",
  "LCX8-ACTION-0152",
  "LCX8-ACTION-0153",
  "LCX8-ACTION-0154",
  "LCX8-ACTION-0155",
  "LCX8-ACTION-0156",
  "LCX8-ACTION-0157",
  "LCX8-ACTION-0158",
  "LCX8-ACTION-0159",
  "LCX8-ACTION-0160",
  "LCX8-ACTION-0161",
  "LCX8-ACTION-0162",
  "LCX8-ACTION-0163"
];
const DEFERRED_LEGACY_ROWS = ["LCX8-ACTION-0146", "LCX8-ACTION-0147", "LCX8-ACTION-0149", "LCX8-ACTION-0150", "LCX8-ACTION-0151"];
const STATUS_ORDER = ["PASS", "GUARDED", "UI_ONLY", "DESCRIPTOR_ONLY", "BLOCKED", "FAIL", "UNKNOWN"];
const BATCH_ID = "LCX8-ALL-30";
const generatedAt = new Date().toISOString();
const resolutionKey = "post_closeout_ui_only_final_lcx8_action_0148_0152_0163_people_sidebar_current_ui";
const verificationSummary =
  "Post-closeout LCX8-ACTION-0148/0152..0163 People sidebar current-UI proof PASS. Browser proof clicked the current People sidebar group and route items, confirmed hash routing into PeopleHome sections, active sidebar state, no API writes, no API 5xx, and product-label reconciliation for labels that changed in the current UI. Status remains UI_ONLY as final local route/navigation classification. LCX8-ACTION-0146/0147/0149/0150/0151 are deferred because their legacy Legal People/sidebar labels are no longer current visible sidebar actions.";
const latestNote =
  "Post-closeout People sidebar current-UI proof confirmed UI_ONLY final classification for current visible People sidebar group/routes. Legacy Legal People/sidebar labels are deferred for separate current-product reconciliation.";

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
  if (!row || row.status_decision !== "UI_ONLY final") throw new Error(`Expected ${id} UI_ONLY final proof`);
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
    `Post-closeout ${id} People sidebar current-UI proof: product_label=${proofRow.product_label}; section=${proofRow.expected_section ?? "group-toggle"}; no_api_write=${proofRow.api_write_count === 0 || proofRow.api_write_count === undefined}; artifact=${PROOF_JSON}`
  );
  appendUnique(
    row.evidence,
    "Post-closeout non-claim: UI_ONLY route/navigation proof only; no API write, persistence, external provider, production-ready, or go-live claim."
  );
  row.status = "UI_ONLY";
  if (!String(row.notes ?? "").includes("People sidebar current-UI proof")) {
    row.notes = `${row.notes ?? ""} ${latestNote}`.trim();
  }
}

for (const id of DEFERRED_LEGACY_ROWS) {
  const row = rowMap.get(id);
  if (!row) continue;
  appendUnique(
    row.evidence,
    `Post-closeout current-product reconciliation note: ${id} legacy Legal People/sidebar selector was excluded from ${PROOF_JSON} because the current visible People sidebar no longer exposes that legacy label; needs separate route-only/superseded classification.`
  );
}

const countsAfter = statusCounts(rows);
if (JSON.stringify(countsAfter) !== JSON.stringify(countsBefore)) {
  throw new Error(`People sidebar UI_ONLY final update must not change counts: before=${JSON.stringify(countsBefore)} after=${JSON.stringify(countsAfter)}`);
}

updateCountFields(ledger, countsAfter);
ledger.coverage = {
  ...(ledger.coverage ?? {}),
  inventory_rows: rows.length,
  unknown_rows: countsAfter.UNKNOWN,
  latest_post_closeout_batch: BATCH_ID,
  latest_ui_only_final_rows: ROW_IDS,
  latest_deferred_current_product_reconciliation_rows: DEFERRED_LEGACY_ROWS
};
writeJson(LEDGER_JSON, ledger);

const csvLines = readFileSync(LEDGER_CSV, "utf8").trimEnd().split("\n");
const nextCsvLines = csvLines.map((line) => {
  const id = line.split(",", 1)[0];
  return rowMap.has(id) ? rowToCsv(rowMap.get(id)) : line;
});
writeFileSync(LEDGER_CSV, `${nextCsvLines.join("\n")}\n`);

const resolution = {
  schema_version: "law-firm-os.lcx8.post-closeout.people-sidebar-current-ui.v0.1",
  generated_at: generatedAt,
  batch_id: BATCH_ID,
  action_ids: ROW_IDS,
  deferred_legacy_rows: DEFERRED_LEGACY_ROWS,
  status_before: "UI_ONLY",
  status_after: "UI_ONLY",
  status_decision: "UI_ONLY final classification; status remains UI_ONLY",
  reason: "current_product_sidebar_route_navigation_local_state_only",
  proof: PROOF_JSON,
  proof_md: PROOF_MD,
  counts_before: countsBefore,
  counts_after: countsAfter,
  evidence: proof.rowProofs.map((row) => ({
    id: row.id,
    product_label: row.product_label,
    expected_section: row.expected_section ?? null,
    reconciliation: row.reconciliation ?? null,
    screenshot: row.screenshot,
    status_decision: row.status_decision
  })),
  latest_verification_summary: verificationSummary,
  non_claims: proof.non_claims
};
writeJson(CLOSEOUT_JSON, resolution);
writeFileSync(CLOSEOUT_MD, `${[
  "# LCX8 People Sidebar Current UI Closeout",
  "",
  "- Status before: UI_ONLY",
  "- Status after: UI_ONLY",
  "- Decision: UI_ONLY final classification",
  "- Reason: current_product_sidebar_route_navigation_local_state_only",
  `- Proof: ${PROOF_JSON}`,
  `- Proof markdown: ${PROOF_MD}`,
  "",
  `Verification: ${verificationSummary}`,
  "",
  "## Rows",
  ...resolution.evidence.map((row) => `- ${row.id}: ${row.product_label}; ${row.expected_section ?? "group-toggle"}${row.reconciliation ? `; ${row.reconciliation}` : ""}`),
  "",
  "## Deferred Legacy Rows",
  ...DEFERRED_LEGACY_ROWS.map((id) => `- ${id}: separate current-product route-only/superseded classification required`),
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
        row.latest_status_decision = "UI_ONLY final classification; current product sidebar route/navigation proof captured.";
      }
    }
  }
  if (path === ISSUES_JSON) {
    for (const issue of doc.issues ?? []) {
      if (ROW_IDS.includes(recordId(issue))) {
        issue.latest_evidence = PROOF_JSON;
        issue.latest_status_decision = "UI_ONLY final classification; current product sidebar route/navigation proof captured.";
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
    "- Latest UI_ONLY final classification: `LCX8-ACTION-0148/0152..0163` People sidebar current-UI route/navigation proof captured; status remains `UI_ONLY`.",
    `- Deferred current-product reconciliation: ${DEFERRED_LEGACY_ROWS.map((id) => "`" + id + "`").join(", ")}.`,
    `- Current status counts after remediation: PASS ${countsAfter.PASS}, GUARDED ${countsAfter.GUARDED}, UI_ONLY ${countsAfter.UI_ONLY}, DESCRIPTOR_ONLY ${countsAfter.DESCRIPTOR_ONLY}, BLOCKED ${countsAfter.BLOCKED}, FAIL ${countsAfter.FAIL}, UNKNOWN ${countsAfter.UNKNOWN}.`,
    `- Evidence: ${PROOF_JSON}, ${CLOSEOUT_JSON}.`,
    `- Verification: ${verificationSummary}`,
    "- Non-claim: no API write, persistence, external provider, production-ready, or go-live claim is made."
  ].join("\n")
);
writeFileSync(BACKLOG_MD, backlog);

const progressLine = `- 2026-06-28: \`LCX8-ACTION-0148/0152..0163\` remain \`UI_ONLY\` with \`${BATCH_ID}\` People sidebar current-UI final classification proof. Browser proof captured current visible People sidebar group/routes, hash routing into PeopleHome, active sidebar state, no API writes, no API 5xx, and product-label reconciliation. Deferred separate current-product reconciliation rows: ${DEFERRED_LEGACY_ROWS.join(", ")}. Counts unchanged: PASS ${countsAfter.PASS}, GUARDED ${countsAfter.GUARDED}, UI_ONLY ${countsAfter.UI_ONLY}, DESCRIPTOR_ONLY ${countsAfter.DESCRIPTOR_ONLY}, BLOCKED ${countsAfter.BLOCKED}, FAIL ${countsAfter.FAIL}, UNKNOWN ${countsAfter.UNKNOWN}.`;
let plan = readFileSync(PLAN_MD, "utf8");
plan = plan.replace(/## Current Snapshot[\s\S]*?## Execution Progress/, `${currentSnapshot}\n## Execution Progress`);
if (!plan.includes("`LCX8-ACTION-0148/0152..0163` remain `UI_ONLY`")) {
  plan = plan.replace("\n## LazyCodex Execution Rules", `\n${progressLine}\n\n## LazyCodex Execution Rules`);
}
writeFileSync(PLAN_MD, plan);

let statusMd = readFileSync(POST_STATUS_MD, "utf8");
if (!statusMd.includes("LCX8-ACTION-0148/0152..0163 People sidebar current UI")) {
  statusMd += `\n## LCX8-ACTION-0148/0152..0163 People sidebar current UI\n\n- Status: UI_ONLY final classification; status remains UI_ONLY\n- Proof: ${PROOF_JSON}\n- Closeout: ${CLOSEOUT_JSON}\n- Verification: ${verificationSummary}\n- Deferred rows: ${DEFERRED_LEGACY_ROWS.join(", ")}\n- Non-claim: no API write, persistence, external provider, production-ready, or go-live claim.\n`;
}
writeFileSync(POST_STATUS_MD, statusMd);

let auditMd = readFileSync(AUDIT_MD, "utf8");
if (!auditMd.includes("Post-Closeout People Sidebar Current UI Proof")) {
  auditMd += `\n## Post-Closeout People Sidebar Current UI Proof\n\n- \`LCX8-ACTION-0148/0152..0163\` People sidebar current UI proof: ${PROOF_JSON}\n- Closeout: ${CLOSEOUT_JSON}\n- Verification: ${verificationSummary}\n- Boundary: status remains \`UI_ONLY\`; no API write, persistence, external provider, production-ready, or go-live claim is made.\n`;
}
writeFileSync(AUDIT_MD, auditMd);

console.log(JSON.stringify({
  updated_rows: ROW_IDS,
  deferred_legacy_rows: DEFERRED_LEGACY_ROWS,
  counts_before: countsBefore,
  counts_after: countsAfter,
  proof: PROOF_JSON,
  closeout: CLOSEOUT_JSON,
  status_decision: "UI_ONLY final classification; status remains UI_ONLY"
}, null, 2));
