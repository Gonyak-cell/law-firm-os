#!/usr/bin/env node
import assert from "node:assert/strict";
import {
  buildAuditRequiredAction,
  buildGlobalDecisionPackets,
  listGlobalAuditSurfaces
} from "../apps/web/src/data/globalDecisionAuditKernel.js";
import {
  GLOBAL_DECISIONS_PROOF_PATH,
  GLOBAL_DECISIONS_RECEIPT_MD_PATH,
  GLOBAL_DECISIONS_RECEIPT_PATH,
  markdownTable,
  readJson,
  writeJson,
  writeText
} from "./lcx-full-helpers.mjs";

const packageJson = readJson("package.json");
assert.equal(packageJson.scripts?.["lcx:full:global-decisions:validate"], "node scripts/validate-lcx-full-global-decisions.mjs");
assert.equal(packageJson.scripts?.["lcx:full:global-decisions-browser-proof"], "node scripts/run-lcx-full-global-decisions-browser-proof.mjs");
const proof = readJson(GLOBAL_DECISIONS_PROOF_PATH);
assert.equal(proof.verdict, "PASS");

const packet = buildGlobalDecisionPackets();
const calendarReceiptProbe = buildGlobalDecisionPackets({ ownerReceipts: { calendar: "owner:receipt:calendar-local" } });
const blockedAudit = buildAuditRequiredAction();
const recordableAudit = buildAuditRequiredAction({ reasonRef: "reason:advanced-settings", actorRef: "actor:reviewer" });
const surfaces = listGlobalAuditSurfaces();

assert.equal(packet.rows.length, 4);
assert.equal(packet.packet_state, "owner-decision-required");
assert.equal(packet.permanent_global_promotion_claim, false);
assert.equal(calendarReceiptProbe.rows.find((row) => row.utility_id === "calendar").permanently_promoted, false);
assert.equal(blockedAudit.action_state, "audit-required");
assert.equal(recordableAudit.action_state, "audit-recordable");
assert.equal(recordableAudit.executed, false);
assert.ok(surfaces.some((surface) => surface.surface_state === "decision-required"));
assert.ok(surfaces.some((surface) => surface.surface_state === "audit-required"));

const receipt = {
  schema_version: "law-firm-os.lazycodex.lcx_full.global_decisions_receipt.v0.1",
  generated_at: new Date().toISOString(),
  tuw_ids: ["LCX-FULL-17.01", "LCX-FULL-17.02", "LCX-FULL-17.03", "LCX-FULL-17.04", "LCX-FULL-17.05", "LCX-FULL-17.06"],
  verdict: "PASS",
  browser_proof: GLOBAL_DECISIONS_PROOF_PATH,
  decision_packet_state: packet.packet_state,
  decision_rows: packet.rows,
  audit_required_state: blockedAudit.action_state,
  audit_recordable_state: recordableAudit.action_state,
  boundary: {
    permanent_global_promotion_claim: false,
    owner_decision_claim: false,
    advanced_settings_executed: false,
    go_live_approved: false,
    production_go_live_claim: false,
    public_release_claim: false
  }
};

writeJson(GLOBAL_DECISIONS_RECEIPT_PATH, receipt);
writeText(
  GLOBAL_DECISIONS_RECEIPT_MD_PATH,
  `# LCX-FULL-17 Global Decisions Receipt\n\nGenerated at: ${receipt.generated_at}\n\nVerdict: PASS\n\n${markdownTable(packet.rows.map((row) => ({ Check: row.utility_id, Result: row.decision_state })), ["Check", "Result"])}\n\nBoundary: global decision rows remain owner-blocked/not-promoted unless real owner evidence is supplied; advanced settings are audit-recordable only and not executed; no go-live or public release claim.\n`
);

console.log(JSON.stringify({ verdict: "PASS", receipt: GLOBAL_DECISIONS_RECEIPT_PATH }, null, 2));
