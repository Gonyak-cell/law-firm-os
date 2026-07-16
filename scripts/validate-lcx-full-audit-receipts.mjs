#!/usr/bin/env node
import assert from "node:assert/strict";
import { existsSync, readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { buildReceiptReconciliation } from "../apps/web/src/data/globalDecisionAuditKernel.js";
import {
  ARTIFACT_DIR,
  AUDIT_RECEIPTS_MD_PATH,
  AUDIT_RECEIPTS_PATH,
  AUDIT_RECEIPTS_PROOF_PATH,
  markdownTable,
  readJson,
  writeJson,
  writeText
} from "./lcx-full-helpers.mjs";

const packageJson = readJson("package.json");
assert.equal(packageJson.scripts?.["lcx:full:audit-receipts:validate"], "node scripts/validate-lcx-full-audit-receipts.mjs");
assert.equal(packageJson.scripts?.["lcx:full:audit-browser-proof"], "node scripts/run-lcx-full-audit-browser-proof.mjs");
const proof = readJson(AUDIT_RECEIPTS_PROOF_PATH);
assert.equal(proof.verdict, "PASS");

function listJsonFiles(dir) {
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) return listJsonFiles(path);
    return entry.isFile() && entry.name.endsWith(".json") ? [path] : [];
  });
}

function countBlockedActions(value) {
  const text = JSON.stringify(value);
  const matches = text.match(/(provider-blocked|owner-blocked|audit-required|review-required|execute_blocked|provider_blocked|owner_blocked)/g);
  return matches?.length ?? 0;
}

const files = listJsonFiles(ARTIFACT_DIR)
  .filter((path) => /lcx-full-\d{2}-.+\.json$/.test(path))
  .sort();
const records = files.map((path) => {
  const parsed = JSON.parse(readFileSync(path, "utf8"));
  const parent = path.match(/lcx-full-(\d{2})-/)?.[1] ?? "unknown";
  return {
    artifact_ref: path,
    tuw_ref: `LCX-FULL-${parent}`,
    exists: true,
    generated_at: parsed.generated_at,
    verdict: parsed.verdict,
    blocked_action_count: countBlockedActions(parsed)
  };
});

const expectedParents = Array.from({ length: 19 }, (_, index) => `LCX-FULL-${String(index).padStart(2, "0")}`);
const parentsWithArtifacts = new Set(records.map((record) => record.tuw_ref));
const missingParents = expectedParents.filter((parent) => !parentsWithArtifacts.has(parent));
const failingArtifacts = records.filter((record) => record.verdict !== "PASS");
const actualReconciliation = buildReceiptReconciliation({ records, staleBefore: "2026-01-01T00:00:00.000Z" });
const probeReconciliation = buildReceiptReconciliation({
  records: [
    { artifact_ref: "artifact:probe-missing", tuw_ref: "LCX-FULL-18.02", exists: false },
    { artifact_ref: "artifact:probe-stale", tuw_ref: "LCX-FULL-18.03", exists: true, generated_at: "2026-01-01T00:00:00.000Z", verdict: "PASS" }
  ],
  staleBefore: "2026-06-30T00:00:00.000Z"
});

assert.deepEqual(missingParents, []);
assert.deepEqual(failingArtifacts, []);
assert.equal(actualReconciliation.reconciliation_state, "passed");
assert.ok(actualReconciliation.blocked_action_count > 0);
assert.equal(probeReconciliation.missing_count, 1);
assert.equal(probeReconciliation.stale_count, 1);
assert.equal(probeReconciliation.raw_payload_export_allowed, false);

const receipt = {
  schema_version: "law-firm-os.lazycodex.lcx_full.audit_receipts_reconciliation.v0.1",
  generated_at: new Date().toISOString(),
  tuw_ids: ["LCX-FULL-18.01", "LCX-FULL-18.02", "LCX-FULL-18.03", "LCX-FULL-18.04", "LCX-FULL-18.05"],
  verdict: "PASS",
  browser_proof: AUDIT_RECEIPTS_PROOF_PATH,
  checked_artifact_count: records.length,
  covered_parents: expectedParents,
  actual_reconciliation_state: actualReconciliation.reconciliation_state,
  blocked_action_count: actualReconciliation.blocked_action_count,
  missing_stale_probe: {
    missing_count: probeReconciliation.missing_count,
    stale_count: probeReconciliation.stale_count,
    flagged: probeReconciliation.reconciliation_state === "review-required"
  },
  boundary: {
    raw_payload_export_allowed: false,
    receipt_export_complete_claim: false,
    production_go_live_claim: false,
    public_release_claim: false
  }
};

writeJson(AUDIT_RECEIPTS_PATH, receipt);
writeText(
  AUDIT_RECEIPTS_MD_PATH,
  `# LCX-FULL-18 Audit Receipts Reconciliation\n\nGenerated at: ${receipt.generated_at}\n\nVerdict: PASS\n\n${markdownTable([{ Check: "artifact coverage", Result: String(records.length) }, { Check: "parents", Result: `${expectedParents[0]}..${expectedParents.at(-1)}` }, { Check: "reconciliation", Result: actualReconciliation.reconciliation_state }, { Check: "blocked ledger rows", Result: String(actualReconciliation.blocked_action_count) }, { Check: "missing/stale probe", Result: receipt.missing_stale_probe.flagged ? "flagged" : "not flagged" }], ["Check", "Result"])}\n\nBoundary: receipt lookup and reconciliation are metadata-only; missing/stale probes are flagged; no raw payload export, receipt export completion, production go-live, or public release claim.\n`
);

console.log(JSON.stringify({ verdict: "PASS", receipt: AUDIT_RECEIPTS_PATH, checked_artifacts: records.length }, null, 2));
