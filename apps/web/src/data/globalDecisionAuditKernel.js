import { conditionalGlobalItems, globalUtilityCatalog } from "./globalUtilities.js";
import { assertNoForbiddenProjection, redactLcxFullValue } from "./readinessModel.js";

const SAFE_REF_PATTERN = /^[A-Za-z0-9._:-]{1,180}$/;

function safeRef(value, fallback = "") {
  if (typeof value !== "string") return fallback;
  const ref = value.trim();
  return SAFE_REF_PATTERN.test(ref) ? ref : fallback;
}

export function buildGlobalDecisionPackets({ ownerReceipts = {} } = {}) {
  const rows = conditionalGlobalItems.map((item) => {
    const receiptRef = safeRef(ownerReceipts[item.id]);
    return Object.freeze({
      decision_id: `global-decision:${item.id}`,
      utility_id: item.id,
      label: item.label,
      decision_state: receiptRef ? "owner-receipt-recorded-not-promoted" : "owner-decision-required",
      owner_receipt_ref: receiptRef,
      permanently_promoted: false,
      route_count: item.sections.reduce((sum, section) => sum + (section.legacyRoutes?.length ?? 0), 0),
      production_go_live_claim: false,
      public_release_claim: false
    });
  });
  return Object.freeze({
    packet_state: rows.every((row) => row.decision_state !== "owner-decision-required") ? "receipt-recorded-not-promoted" : "owner-decision-required",
    rows: Object.freeze(rows),
    permanent_global_promotion_claim: false,
    production_go_live_claim: false,
    public_release_claim: false
  });
}

export function buildAuditRequiredAction({ actionRef = "settings.advanced.force", reasonRef = "", actorRef = "" } = {}) {
  const reason = safeRef(reasonRef);
  const actor = safeRef(actorRef);
  return Object.freeze({
    action_ref: safeRef(actionRef, "settings.advanced.force"),
    action_state: reason && actor ? "audit-recordable" : "audit-required",
    reason_ref: reason,
    actor_ref: actor,
    executed: false,
    audit_event_recorded: Boolean(reason && actor),
    audit_payload_included: false,
    production_go_live_claim: false,
    public_release_claim: false
  });
}

export function buildReceiptReconciliation({ records = [], staleBefore = "2026-06-30T00:00:00.000Z" } = {}) {
  const staleTime = new Date(staleBefore).getTime();
  const rows = records.map((record) => {
    const generatedAt = typeof record.generated_at === "string" ? Date.parse(record.generated_at) : NaN;
    const missing = record.exists !== true;
    const stale = Number.isFinite(generatedAt) && generatedAt < staleTime;
    return Object.freeze({
      artifact_ref: safeRef(record.artifact_ref, "artifact:unknown"),
      tuw_ref: safeRef(record.tuw_ref, "LCX-FULL-unknown"),
      receipt_state: missing ? "missing" : stale ? "stale" : "present",
      verdict: record.verdict === "PASS" ? "PASS" : "REVIEW",
      blocked_action_count: Number.isSafeInteger(record.blocked_action_count) ? record.blocked_action_count : 0
    });
  });
  return Object.freeze({
    reconciliation_state: rows.every((row) => row.receipt_state === "present" && row.verdict === "PASS") ? "passed" : "review-required",
    rows: Object.freeze(rows),
    missing_count: rows.filter((row) => row.receipt_state === "missing").length,
    stale_count: rows.filter((row) => row.receipt_state === "stale").length,
    blocked_action_count: rows.reduce((sum, row) => sum + row.blocked_action_count, 0),
    raw_payload_export_allowed: false,
    production_go_live_claim: false,
    public_release_claim: false
  });
}

export function listGlobalAuditSurfaces() {
  return Object.freeze(
    globalUtilityCatalog.flatMap((utility) =>
      utility.sections
        .filter((section) => section.state === "audit_required" || utility.status === "decision-required")
        .map((section) => Object.freeze({
          utility_id: utility.id,
          section_id: section.id,
          surface_state: section.state === "audit_required" ? "audit-required" : "decision-required",
          legacy_route_count: section.legacyRoutes?.length ?? 0
        }))
    )
  );
}

export function assertGlobalDecisionAuditSafe(value) {
  return assertNoForbiddenProjection(redactLcxFullValue(value));
}
