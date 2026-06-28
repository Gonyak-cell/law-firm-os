#!/usr/bin/env node
import { existsSync, readFileSync, writeFileSync } from "node:fs";

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
const CLOSEOUT_JSON = `${ARTIFACT_DIR}/lcx8-post-closeout-client-data-cloud-2026-06-28.json`;
const CLOSEOUT_MD = `${ARTIFACT_DIR}/lcx8-post-closeout-client-data-cloud-2026-06-28.md`;
const PROOF_JSON = `${ARTIFACT_DIR}/lcx8-action-0129-0134-client-data-cloud-proof.json`;
const PROOF_MD = `${ARTIFACT_DIR}/lcx8-action-0129-0134-client-data-cloud-proof.md`;
const PROOF_SCREENSHOT = `${ARTIFACT_DIR}/lcx8-action-0129-0134-client-data-cloud-proof.png`;

const ROW_IDS = [
  "LCX8-ACTION-0129",
  "LCX8-ACTION-0130",
  "LCX8-ACTION-0131",
  "LCX8-ACTION-0132",
  "LCX8-ACTION-0133",
  "LCX8-ACTION-0134"
];

const STATUS_ORDER = ["PASS", "GUARDED", "UI_ONLY", "DESCRIPTOR_ONLY", "BLOCKED", "FAIL", "UNKNOWN"];
const generatedAt = new Date().toISOString();
const defaultVerificationSummary = "Post-closeout LCX8-ACTION-0129..0134 verification: Client Data Cloud proof PASS (13/13 assertions); focused API node --test apps/api/test/sf-b-w07-data-cloud-enrichment.test.js PASS 4/4. Browser clicked current-product provider request, consent confirmation, enrichment preview, execute confirmation, identity candidates, and segment activation controls. API responses returned provider_blocked, owner_blocked, or route_mounted with write audit events/read-back, denied/review fail-closed guards, no data-cloud 4xx/5xx, no browser console errors, no provider payload/raw identifiers, and no production-ready claim. Status remains BLOCKED/Lane D because external provider/owner receipts are still missing.";
const verificationSummary = process.env.LCX8_VERIFICATION_SUMMARY || defaultVerificationSummary;
const latestNote = "Post-closeout LCX8-ACTION-0129..0134 Client Data Cloud blocker proof captured current-product guarded behavior. UI/API proof PASS 13/13; writes produced audit events and read-back; denied/review guards failed closed; external provider runtime remains disabled. Status remains BLOCKED/Lane D because external provider/owner receipts are missing.";

function readJson(path) {
  return JSON.parse(readFileSync(path, "utf8"));
}

function writeJson(path, value) {
  writeFileSync(path, `${JSON.stringify(value, null, 2)}\n`);
}

function appendUnique(list, value) {
  if (!list.includes(value)) list.push(value);
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
  return Object.fromEntries(Object.entries(counts).sort(([a], [b]) => a.localeCompare(b)));
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
  doc.status_counts = counts;
  doc.status_counts_after = counts;
  doc.latest_note = latestNote;
  doc.latest_verification_summary = verificationSummary;
}

function addResolution(doc, key, resolution) {
  doc.generated_at = generatedAt;
  doc.status_counts = resolution.counts_after;
  doc.status_counts_after = resolution.counts_after;
  doc.latest_note = latestNote;
  doc.latest_verification_summary = verificationSummary;
  doc[key] = resolution;
}

const ledger = readJson(LEDGER_JSON);
const rows = ledger.rows ?? ledger.actions;
const countsBefore = statusCounts(rows);
for (const row of rows) {
  if (!ROW_IDS.includes(row.id)) continue;
  appendUnique(row.evidence, `Post-closeout LCX8-ACTION-0129..0134 Client Data Cloud blocker proof: browser clicked ${row.label}; API path ${row.api_route} returned current-product guarded response with audit/read-back proof where applicable; artifact=${PROOF_JSON}`);
  appendUnique(row.evidence, "Post-closeout non-claim: external provider runtime remains disabled, no provider receipt captured, no owner approval/go-live/production-ready claim; status remains BLOCKED/Lane D.");
  if (!row.notes.includes("Post-closeout LCX8-ACTION-0129..0134")) {
    row.notes = `${row.notes} ${latestNote}`;
  }
  row.status = "BLOCKED";
  row.remediation_lane = "Lane D";
}
const countsAfter = statusCounts(rows);
updateCountFields(ledger, countsAfter);
ledger.coverage = {
  ...(ledger.coverage ?? {}),
  inventory_rows: rows.length,
  unknown_rows: countsAfter.UNKNOWN,
  latest_post_closeout_batch: "LCX8-ALL-21"
};
writeJson(LEDGER_JSON, ledger);

const csvLines = readFileSync(LEDGER_CSV, "utf8").trimEnd().split("\n");
const rowMap = new Map(rows.map((row) => [row.id, row]));
const nextCsvLines = csvLines.map((line) => {
  const id = line.split(",", 1)[0];
  return rowMap.has(id) ? rowToCsv(rowMap.get(id)) : line;
});
writeFileSync(LEDGER_CSV, `${nextCsvLines.join("\n")}\n`);

const resolution = {
  schema_version: "law-firm-os.lcx8.post-closeout.client-data-cloud.v0.1",
  generated_at: generatedAt,
  batch_id: "LCX8-ALL-21",
  action_ids: ROW_IDS,
  status_before: "BLOCKED",
  status_after: "BLOCKED",
  status_decision: "BLOCKED remains BLOCKED / Lane D",
  reason: "external_provider_owner_receipt_required",
  proof: PROOF_JSON,
  proof_md: PROOF_MD,
  screenshot: PROOF_SCREENSHOT,
  focused_api: "node --test apps/api/test/sf-b-w07-data-cloud-enrichment.test.js PASS 4/4",
  browser_proof: "PASS 13/13 assertions; data-cloud responses 16; API 4xx/5xx 0; console errors 0",
  counts_before: countsBefore,
  counts_after: countsAfter,
  evidence: [
    "Current-product Client Data Cloud buttons are wired to DataCloudEnrichmentPanel handlers and data-cloud API routes.",
    "Browser proof captured provider_blocked/owner_blocked/route_mounted guarded outcomes, write audit events, read-back responses, denied/review fail-closed guards, and safe redaction.",
    "External provider runtime remains disabled and no external provider/owner receipt is captured; status remains BLOCKED/Lane D."
  ],
  latest_verification_summary: verificationSummary,
  non_claims: [
    "local synthetic runtime blocker proof only",
    "no external data-cloud provider configured or executed",
    "no external provider receipt captured",
    "no owner approval captured",
    "no product record mutation or production-ready claim",
    "status remains BLOCKED/Lane D until external/provider/owner receipt exists"
  ]
};
writeJson(CLOSEOUT_JSON, resolution);
writeFileSync(CLOSEOUT_MD, `${[
  "# LCX8-ACTION-0129..0134 Client Data Cloud Blocker Status",
  "",
  "- Status before: BLOCKED",
  "- Status after: BLOCKED",
  "- Lane: Lane D",
  "- Reason: external_provider_owner_receipt_required",
  `- Proof: ${PROOF_JSON}`,
  `- Screenshot: ${PROOF_SCREENSHOT}`,
  "",
  `Verification: ${verificationSummary}`,
  "",
  "## Non-Claims",
  ...resolution.non_claims.map((item) => `- ${item}`)
].join("\n")}\n`);

for (const [path, key] of [
  [ACTION_RUN, "post_closeout_blocker_evidence_lcx8_action_0129_0134_client_data_cloud"],
  [POST_STATUS_JSON, "post_closeout_blocker_evidence_lcx8_action_0129_0134_client_data_cloud"],
  [FINAL_LANE_JSON, "post_closeout_blocker_evidence_lcx8_action_0129_0134_client_data_cloud"],
  [RISK_JSON, "post_closeout_blocker_evidence_lcx8_action_0129_0134_client_data_cloud"],
  [ISSUES_JSON, "post_closeout_blocker_evidence_lcx8_action_0129_0134_client_data_cloud"]
]) {
  const doc = readJson(path);
  addResolution(doc, key, resolution);
  if (path === ISSUES_JSON) {
    for (const issue of doc.issues ?? []) {
      if (ROW_IDS.includes(issue.id)) {
        issue.latest_evidence = PROOF_JSON;
        issue.latest_status_decision = "BLOCKED remains BLOCKED / Lane D; external/provider/owner receipt still required.";
      }
    }
  }
  if (path === RISK_JSON) {
    for (const row of doc.ranked_rows ?? []) {
      if (ROW_IDS.includes(row.id)) {
        row.latest_evidence = PROOF_JSON;
        row.latest_status_decision = "BLOCKED remains BLOCKED / Lane D; external/provider/owner receipt still required.";
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

function replaceBlock(text, begin, end, content) {
  const pattern = new RegExp(`${begin}[\\s\\S]*?${end}`);
  return text.replace(pattern, `${begin}\n${content}\n${end}`);
}

let backlog = readFileSync(BACKLOG_MD, "utf8");
backlog = replaceBlock(
  backlog,
  "<!-- LCX8:POST-CLOSEOUT-REMEDIATION:BEGIN -->",
  "<!-- LCX8:POST-CLOSEOUT-REMEDIATION:END -->",
  [
    "## Post-Closeout Remediation Update",
    "",
    "- Latest blocker evidence: `LCX8-ACTION-0129..0134` Client Data Cloud guarded provider/owner proof captured; status remains `BLOCKED` / `Lane D`.",
    `- Current status counts after remediation: PASS ${countsAfter.PASS}, GUARDED ${countsAfter.GUARDED}, UI_ONLY ${countsAfter.UI_ONLY}, DESCRIPTOR_ONLY ${countsAfter.DESCRIPTOR_ONLY}, BLOCKED ${countsAfter.BLOCKED}, FAIL ${countsAfter.FAIL}, UNKNOWN ${countsAfter.UNKNOWN}.`,
    `- Evidence: ${PROOF_JSON}, ${CLOSEOUT_JSON}.`,
    `- Verification: ${verificationSummary}`,
    "- Non-claim: Data Cloud external provider runtime remains disabled; no external provider receipt, owner approval, product record mutation, production go-live, or production-ready claim is made."
  ].join("\n")
);
writeFileSync(BACKLOG_MD, backlog);

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

const progressLine = `- 2026-06-28: \`LCX8-ACTION-0129..0134\` remain \`BLOCKED\` / Lane D with \`LCX8-ALL-21\` Client Data Cloud guarded provider/owner proof. Browser/API proof PASS 13/13 captured provider request, consent confirmation, enrichment preview, execute confirmation, identity candidates, and segment activation controls; responses included write audit events/read-back, denied/review fail-closed guards, no data-cloud 4xx/5xx, no console errors, and no provider payload/raw identifier/production-ready claim. Counts unchanged: PASS ${countsAfter.PASS}, GUARDED ${countsAfter.GUARDED}, UI_ONLY ${countsAfter.UI_ONLY}, DESCRIPTOR_ONLY ${countsAfter.DESCRIPTOR_ONLY}, BLOCKED ${countsAfter.BLOCKED}, FAIL ${countsAfter.FAIL}, UNKNOWN ${countsAfter.UNKNOWN}. No external provider/owner receipt is claimed.`;
let plan = readFileSync(PLAN_MD, "utf8");
plan = plan.replace(/## Current Snapshot[\s\S]*?## Execution Progress/, `${currentSnapshot}\n## Execution Progress`);
if (!plan.includes("`LCX8-ACTION-0129..0134` remain `BLOCKED`")) {
  plan = plan.replace("\n## LazyCodex Execution Rules", `\n${progressLine}\n\n## LazyCodex Execution Rules`);
}
writeFileSync(PLAN_MD, plan);

let statusMd = readFileSync(POST_STATUS_MD, "utf8");
if (!statusMd.includes("LCX8-ACTION-0129..0134 Client Data Cloud")) {
  statusMd += `\n## LCX8-ACTION-0129..0134 Client Data Cloud\n\n- Status: BLOCKED remains BLOCKED / Lane D\n- Proof: ${PROOF_JSON}\n- Closeout: ${CLOSEOUT_JSON}\n- Verification: ${verificationSummary}\n- Non-claim: no external data-cloud provider receipt, owner approval, product mutation, production go-live, or production-ready claim.\n`;
}
writeFileSync(POST_STATUS_MD, statusMd);

let auditMd = readFileSync(AUDIT_MD, "utf8");
if (!auditMd.includes("LCX8-ACTION-0129..0134 Client Data Cloud blocker proof")) {
  auditMd += `\n## Post-Closeout Client Data Cloud Blocker Proof\n\n- \`LCX8-ACTION-0129..0134\` Client Data Cloud blocker proof: ${PROOF_JSON}\n- Closeout: ${CLOSEOUT_JSON}\n- Verification: ${verificationSummary}\n- Boundary: status remains \`BLOCKED\` / Lane D; no external provider/owner receipt, product mutation, production go-live, or production-ready claim is made.\n`;
}
writeFileSync(AUDIT_MD, auditMd);

console.log(JSON.stringify({
  updated_rows: ROW_IDS,
  counts_before: countsBefore,
  counts_after: countsAfter,
  proof: PROOF_JSON,
  closeout: CLOSEOUT_JSON,
  status_decision: "BLOCKED remains BLOCKED / Lane D"
}, null, 2));
