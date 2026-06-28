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
const PROOF_JSON = `${ARTIFACT_DIR}/lcx8-action-0062-0281-0318-0322-final-blocker-descriptor-proof.json`;
const PROOF_MD = `${ARTIFACT_DIR}/lcx8-action-0062-0281-0318-0322-final-blocker-descriptor-proof.md`;
const CLOSEOUT_JSON = `${ARTIFACT_DIR}/lcx8-post-closeout-final-blocker-descriptor-2026-06-28.json`;
const CLOSEOUT_MD = `${ARTIFACT_DIR}/lcx8-post-closeout-final-blocker-descriptor-2026-06-28.md`;

const ROW_IDS = ["LCX8-ACTION-0062", "LCX8-ACTION-0281", "LCX8-ACTION-0318", "LCX8-ACTION-0322"];
const STATUS_ORDER = ["PASS", "GUARDED", "UI_ONLY", "DESCRIPTOR_ONLY", "BLOCKED", "FAIL", "UNKNOWN"];
const BATCH_ID = "LCX8-ALL-34";
const generatedAt = new Date().toISOString();
const resolutionKey = "post_closeout_final_blocker_descriptor_lcx8_action_0062_0281_0318_0322";
const verificationSummary =
  "Post-closeout LCX8-ACTION-0062/0281/0318/0322 final blocker/descriptor proof PASS. API tests passed 191/191. Matter write rows 0062 and 0318 remain BLOCKED because owner/approval write execution, durable read-back, and audit receipt are not captured. Profile row 0281 remains DESCRIPTOR_ONLY because UserProfileSurface renders unavailable panels without a profile API runtime. Vault row 0322 remains DESCRIPTOR_ONLY because EmailFilingView renders external provider unavailable state with no submit/provider API handler.";
const latestNote =
  "Post-closeout final blocker/descriptor proof closed the remaining evidence gap: Matter write rows stay BLOCKED pending owner/approval receipts; Profile/Vault unavailable states stay DESCRIPTOR_ONLY.";

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
  if (!row) throw new Error(`Expected ${id} row proof`);
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
    `Post-closeout ${id} final blocker/descriptor proof: decision=${proofRow.status_decision}; observed="${proofRow.observed}"; missing_receipt=${proofRow.missing_receipt}; artifact=${PROOF_JSON}`
  );
  appendUnique(
    row.evidence,
    "Post-closeout non-claim: no owner/approval write execution, durable read-back, audit write receipt, external provider receipt, production-ready, or go-live claim."
  );
  if (!String(row.notes ?? "").includes("final blocker/descriptor proof")) {
    row.notes = `${row.notes ?? ""} ${latestNote}`.trim();
  }
}

const countsAfter = statusCounts(rows);
if (JSON.stringify(countsAfter) !== JSON.stringify(countsBefore)) {
  throw new Error(`Final blocker/descriptor update must not change counts: before=${JSON.stringify(countsBefore)} after=${JSON.stringify(countsAfter)}`);
}

updateCountFields(ledger, countsAfter);
ledger.coverage = {
  ...(ledger.coverage ?? {}),
  inventory_rows: rows.length,
  unknown_rows: countsAfter.UNKNOWN,
  latest_post_closeout_batch: BATCH_ID,
  latest_final_blocker_descriptor_rows: ROW_IDS
};
writeJson(LEDGER_JSON, ledger);

const csvLines = readFileSync(LEDGER_CSV, "utf8").trimEnd().split("\n");
const nextCsvLines = csvLines.map((line) => {
  const id = line.split(",", 1)[0];
  return rowMap.has(id) ? rowToCsv(rowMap.get(id)) : line;
});
writeFileSync(LEDGER_CSV, `${nextCsvLines.join("\n")}\n`);

const resolution = {
  schema_version: "law-firm-os.lcx8.post-closeout.final-blocker-descriptor.v0.1",
  generated_at: generatedAt,
  batch_id: BATCH_ID,
  action_ids: ROW_IDS,
  status_before: "mixed BLOCKED/DESCRIPTOR_ONLY",
  status_after: "mixed BLOCKED/DESCRIPTOR_ONLY",
  status_decision: "final BLOCKED/DESCRIPTOR_ONLY classification",
  reason: "owner_approval_receipt_missing_or_descriptor_runtime_missing",
  proof: PROOF_JSON,
  proof_md: PROOF_MD,
  counts_before: countsBefore,
  counts_after: countsAfter,
  evidence: proof.rowProofs.map((row) => ({
    id: row.id,
    status_decision: row.status_decision,
    proof_type: row.proof_type,
    observed: row.observed,
    missing_receipt: row.missing_receipt
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
  "# LCX8 Final Blocker And Descriptor Closeout",
  "",
  "- Status before: mixed BLOCKED/DESCRIPTOR_ONLY",
  "- Status after: mixed BLOCKED/DESCRIPTOR_ONLY",
  "- Decision: final BLOCKED/DESCRIPTOR_ONLY classification",
  "- Reason: owner_approval_receipt_missing_or_descriptor_runtime_missing",
  `- Proof: ${PROOF_JSON}`,
  `- Proof markdown: ${PROOF_MD}`,
  "",
  "## Commands",
  ...resolution.tests.map((test) => `- ${test.command}: PASS ${test.summary?.pass ?? "unknown"}/${test.summary?.tests ?? "unknown"}, fail ${test.summary?.fail ?? "unknown"}`),
  "",
  `Verification: ${verificationSummary}`,
  "",
  "## Rows",
  ...resolution.evidence.map((row) => `- ${row.id}: ${row.status_decision}; ${row.observed}; missing=${row.missing_receipt}`),
  "",
  "## Non-Claims",
  ...resolution.non_claims.map((item) => `- ${item}`)
].join("\n")}\n`);

for (const path of [ACTION_RUN, POST_STATUS_JSON, FINAL_LANE_JSON, RISK_JSON, ISSUES_JSON]) {
  const doc = readJson(path);
  addResolution(doc, resolution);
  if (path === ACTION_RUN) {
    doc.post_closeout_remediation = doc.post_closeout_remediation ?? {};
    doc.post_closeout_remediation.final_blocker_descriptor_rows = doc.post_closeout_remediation.final_blocker_descriptor_rows ?? [];
    for (const id of ROW_IDS) appendUnique(doc.post_closeout_remediation.final_blocker_descriptor_rows, id);
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
  if (path === RISK_JSON) {
    for (const row of doc.ranked_rows ?? []) {
      if (ROW_IDS.includes(recordId(row))) {
        row.latest_evidence = PROOF_JSON;
        row.latest_status_decision = "Final blocker/descriptor classification; owner/approval receipt missing or descriptor runtime missing.";
      }
    }
  }
  if (path === ISSUES_JSON) {
    for (const issue of doc.issues ?? []) {
      if (ROW_IDS.includes(recordId(issue))) {
        issue.latest_evidence = PROOF_JSON;
        issue.latest_status_decision = "Final blocker/descriptor classification; owner/approval receipt missing or descriptor runtime missing.";
      }
    }
  }
  writeJson(path, doc);
}

for (const path of [FINAL_STATUS_JSON, CRITICAL_UNKNOWN_JSON]) {
  const doc = readJson(path);
  updateCountFields(doc, countsAfter);
  doc[resolutionKey] = {
    batch_id: BATCH_ID,
    action_ids: ROW_IDS,
    proof: PROOF_JSON,
    closeout: CLOSEOUT_JSON,
    status_decision: "final BLOCKED/DESCRIPTOR_ONLY classification"
  };
  if (path === CRITICAL_UNKNOWN_JSON) {
    doc.critical_unknown_count = countsAfter.UNKNOWN;
    doc.pass = countsAfter.UNKNOWN === 0;
  }
  writeJson(path, doc);
}

const nonPassRows = rows.filter((row) => row.status !== "PASS");
const currentSnapshot = [
  "## Current Snapshot",
  "",
  `- Inventory rows: ${rows.length}`,
  `- PASS: ${countsAfter.PASS}`,
  `- GUARDED: ${countsAfter.GUARDED}`,
  `- UI_ONLY: ${countsAfter.UI_ONLY}`,
  `- DESCRIPTOR_ONLY: ${countsAfter.DESCRIPTOR_ONLY}`,
  `- BLOCKED: ${countsAfter.BLOCKED}`,
  `- FAIL: ${countsAfter.FAIL}`,
  `- UNKNOWN: ${countsAfter.UNKNOWN}`,
  `- Latest batch: ${BATCH_ID} final blocker/descriptor classification`,
  `- Latest proof: ${PROOF_JSON}`,
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
    "- Latest final blocker/descriptor classification: `LCX8-ACTION-0062/0281/0318/0322` proof captured; statuses remain `BLOCKED` or `DESCRIPTOR_ONLY`.",
    `- Current status counts after remediation: PASS ${countsAfter.PASS}, GUARDED ${countsAfter.GUARDED}, UI_ONLY ${countsAfter.UI_ONLY}, DESCRIPTOR_ONLY ${countsAfter.DESCRIPTOR_ONLY}, BLOCKED ${countsAfter.BLOCKED}, FAIL ${countsAfter.FAIL}, UNKNOWN ${countsAfter.UNKNOWN}.`,
    `- Evidence: ${PROOF_JSON}, ${CLOSEOUT_JSON}.`,
    `- Verification: ${verificationSummary}`,
    "- Non-claim: no owner/approval write execution, durable read-back, audit write receipt, external provider receipt, production-ready, or go-live claim is made."
  ].join("\n")
);
writeFileSync(BACKLOG_MD, backlog);

const progressLine = `- 2026-06-28: \`LCX8-ACTION-0062/0281/0318/0322\` retain \`BLOCKED\`/\`DESCRIPTOR_ONLY\` with \`${BATCH_ID}\` final blocker/descriptor classification proof. API tests PASS 191/191. Matter write rows remain BLOCKED pending owner/approval write/read-back/audit receipts; Profile/Vault unavailable states remain DESCRIPTOR_ONLY pending runtime/provider integration. Counts unchanged: PASS ${countsAfter.PASS}, GUARDED ${countsAfter.GUARDED}, UI_ONLY ${countsAfter.UI_ONLY}, DESCRIPTOR_ONLY ${countsAfter.DESCRIPTOR_ONLY}, BLOCKED ${countsAfter.BLOCKED}, FAIL ${countsAfter.FAIL}, UNKNOWN ${countsAfter.UNKNOWN}.`;
let plan = readFileSync(PLAN_MD, "utf8");
plan = plan.replace(/## Current Snapshot[\s\S]*?## Execution Progress/, `${currentSnapshot}\n## Execution Progress`);
if (!plan.includes("`LCX8-ACTION-0062/0281/0318/0322` retain `BLOCKED`/`DESCRIPTOR_ONLY`")) {
  plan = plan.replace("\n## LazyCodex Execution Rules", `\n${progressLine}\n\n## LazyCodex Execution Rules`);
}
writeFileSync(PLAN_MD, plan);

let statusMd = readFileSync(POST_STATUS_MD, "utf8");
if (!statusMd.includes("LCX8-ACTION-0062/0281/0318/0322 Final blocker descriptor")) {
  statusMd += `\n## LCX8-ACTION-0062/0281/0318/0322 Final blocker descriptor\n\n- Status: final BLOCKED/DESCRIPTOR_ONLY classification\n- Proof: ${PROOF_JSON}\n- Closeout: ${CLOSEOUT_JSON}\n- Verification: ${verificationSummary}\n- Non-claim: no owner/approval write execution, durable read-back, audit write receipt, external provider receipt, production-ready, or go-live claim.\n`;
}
writeFileSync(POST_STATUS_MD, statusMd);

let auditMd = readFileSync(AUDIT_MD, "utf8");
if (!auditMd.includes("LCX8-ACTION-0062/0281/0318/0322 Final blocker descriptor")) {
  auditMd += `\n\n### LCX8-ACTION-0062/0281/0318/0322 Final blocker descriptor\n\n- Status: final BLOCKED/DESCRIPTOR_ONLY classification.\n- Proof: ${PROOF_JSON}\n- Closeout: ${CLOSEOUT_JSON}\n- Verification: ${verificationSummary}\n- Non-claim: no owner/approval write execution, durable read-back, audit write receipt, external provider receipt, production-ready, or go-live claim.\n`;
}
writeFileSync(AUDIT_MD, auditMd);

console.log(JSON.stringify({
  updated_rows: ROW_IDS,
  counts_before: countsBefore,
  counts_after: countsAfter,
  proof: PROOF_JSON,
  closeout: CLOSEOUT_JSON,
  status_decision: "final BLOCKED/DESCRIPTOR_ONLY classification"
}, null, 2));
