import assert from "node:assert/strict";
import { test } from "node:test";
import {
  assertGlobalDecisionAuditSafe,
  buildAuditRequiredAction,
  buildGlobalDecisionPackets,
  buildReceiptReconciliation,
  listGlobalAuditSurfaces
} from "../src/data/globalDecisionAuditKernel.js";

test("global decision packets stay owner-blocked without permanent promotion", () => {
  const packet = buildGlobalDecisionPackets();
  const withReceipt = buildGlobalDecisionPackets({ ownerReceipts: { calendar: "owner:calendar-local" } });

  assert.equal(packet.rows.length, 4);
  assert.equal(packet.packet_state, "owner-decision-required");
  assert.ok(packet.rows.some((row) => row.utility_id === "calendar" && row.decision_state === "owner-decision-required"));
  assert.equal(withReceipt.rows.find((row) => row.utility_id === "calendar").decision_state, "owner-receipt-recorded-not-promoted");
  assert.equal(withReceipt.rows.find((row) => row.utility_id === "calendar").permanently_promoted, false);
  assert.equal(packet.permanent_global_promotion_claim, false);
  assert.equal(assertGlobalDecisionAuditSafe({ packet, withReceipt }).valid, true);
});

test("audit-required actions need reason and actor but do not execute", () => {
  const blocked = buildAuditRequiredAction();
  const recordable = buildAuditRequiredAction({ reasonRef: "reason:force-review", actorRef: "actor:reviewer" });

  assert.equal(blocked.action_state, "audit-required");
  assert.equal(recordable.action_state, "audit-recordable");
  assert.equal(recordable.audit_event_recorded, true);
  assert.equal(recordable.executed, false);
  assert.equal(assertGlobalDecisionAuditSafe({ blocked, recordable }).valid, true);
});

test("receipt reconciliation flags missing and stale records without raw export", () => {
  const reconciliation = buildReceiptReconciliation({
    records: [
      { artifact_ref: "artifact:pass", tuw_ref: "LCX-FULL-17.01", exists: true, generated_at: "2026-06-30T12:00:00.000Z", verdict: "PASS", blocked_action_count: 1 },
      { artifact_ref: "artifact:missing", tuw_ref: "LCX-FULL-18.02", exists: false },
      { artifact_ref: "artifact:stale", tuw_ref: "LCX-FULL-18.03", exists: true, generated_at: "2026-06-01T00:00:00.000Z", verdict: "PASS" }
    ]
  });
  const surfaces = listGlobalAuditSurfaces();

  assert.equal(reconciliation.reconciliation_state, "review-required");
  assert.equal(reconciliation.missing_count, 1);
  assert.equal(reconciliation.stale_count, 1);
  assert.equal(reconciliation.raw_payload_export_allowed, false);
  assert.ok(surfaces.some((surface) => surface.surface_state === "audit-required"));
  assert.ok(surfaces.some((surface) => surface.surface_state === "decision-required"));
});
