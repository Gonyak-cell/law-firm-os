import { createHash } from "node:crypto";
import { createOffboardingCase, evaluateOffboardingReadiness } from "./offboarding.js";

export const HRX_OFFBOARDING_EVIDENCE_CATEGORIES = Object.freeze([
  "access_revocation",
  "document_return",
  "legal_hold",
  "matter_reassignment",
  "handover",
  "leave_reconciliation",
]);
export const HRX_OFFBOARDING_EVIDENCE_STATES = Object.freeze([
  "confirmed",
  "superseded",
  "voided",
]);
export const HRX_OFFBOARDING_OPERATIONAL_CLOSE_BLOCKED =
  "HRX_OFFBOARDING_OPERATIONAL_CLOSE_BLOCKED";
export const HRX_OFFBOARDING_SELF_CONFIRMATION_BLOCKED =
  "HRX_OFFBOARDING_SELF_CONFIRMATION_BLOCKED";

function requiredString(input, field) {
  const value = input?.[field];
  if (typeof value !== "string" || value.trim() === "") throw new TypeError(`${field} is required`);
  return value.trim();
}

function isoTimestamp(input, field) {
  const value = requiredString(input, field);
  if (!Number.isFinite(Date.parse(value))) throw new TypeError(`${field} must be an ISO timestamp`);
  return value;
}

function canonicalize(value) {
  if (Array.isArray(value)) return value.map(canonicalize);
  if (!value || typeof value !== "object") return value;
  return Object.fromEntries(
    Object.keys(value)
      .sort()
      .map((key) => [key, canonicalize(value[key])]),
  );
}

export function createOffboardingSourceVersion(value) {
  return `sha256:${createHash("sha256").update(JSON.stringify(canonicalize(value))).digest("hex")}`;
}

export function createOffboardingEvidenceReceipt(input = {}) {
  const category = requiredString(input, "category");
  if (!HRX_OFFBOARDING_EVIDENCE_CATEGORIES.includes(category)) {
    throw new TypeError(`category must be one of ${HRX_OFFBOARDING_EVIDENCE_CATEGORIES.join(", ")}`);
  }
  const state = input.state ?? "confirmed";
  if (!HRX_OFFBOARDING_EVIDENCE_STATES.includes(state)) {
    throw new TypeError(`state must be one of ${HRX_OFFBOARDING_EVIDENCE_STATES.join(", ")}`);
  }
  const recordedAt = isoTimestamp(input, "recorded_at");
  const validUntil = isoTimestamp(input, "valid_until");
  if (validUntil <= recordedAt) throw new TypeError("valid_until must be after recorded_at");
  return Object.freeze({
    tenant_id: requiredString(input, "tenant_id"),
    receipt_id: requiredString(input, "receipt_id"),
    evidence_ref: requiredString(input, "evidence_ref"),
    offboarding_id: requiredString(input, "offboarding_id"),
    category,
    subject_ref: requiredString(input, "subject_ref"),
    state,
    source_version: requiredString(input, "source_version"),
    recorded_at: recordedAt,
    valid_until: validUntil,
    recorded_by_actor_id: requiredString(input, "recorded_by_actor_id"),
  });
}

export function currentOffboardingEvidence(receipts = [], {
  tenant_id: tenantId,
  offboarding_id: offboardingId,
} = {}) {
  const current = new Map();
  for (const receipt of receipts.map(createOffboardingEvidenceReceipt)) {
    if (receipt.tenant_id !== tenantId || receipt.offboarding_id !== offboardingId) continue;
    const key = `${receipt.category}:${receipt.subject_ref}`;
    const prior = current.get(key);
    if (
      !prior ||
      receipt.recorded_at > prior.recorded_at ||
      receipt.recorded_at === prior.recorded_at && receipt.receipt_id > prior.receipt_id
    ) {
      current.set(key, receipt);
    }
  }
  return current;
}

export function offboardingEvidencePointers(caseInput = {}) {
  const offboarding = createOffboardingCase(caseInput);
  return Object.freeze([
    ...offboarding.access_revocations.map((item) => Object.freeze({
      category: "access_revocation",
      subject_ref: item.system_ref,
      evidence_ref: item.confirmation_ref,
    })),
    ...offboarding.document_returns.map((item) => Object.freeze({
      category: "document_return",
      subject_ref: item.document_ref,
      evidence_ref: item.evidence_ref,
    })),
    ...offboarding.legal_hold_checks.map((item) => Object.freeze({
      category: "legal_hold",
      subject_ref: item.hold_ref,
      evidence_ref: item.evidence_ref,
    })),
    ...offboarding.matter_reassignments.map((item) => Object.freeze({
      category: "matter_reassignment",
      subject_ref: item.matter_id,
      evidence_ref: item.handover_ref,
    })),
    ...offboarding.handover_items.map((item) => Object.freeze({
      category: "handover",
      subject_ref: item.item_id,
      evidence_ref: item.evidence_ref,
    })),
    Object.freeze({
      category: "leave_reconciliation",
      subject_ref: offboarding.employee_id,
      evidence_ref: offboarding.leave_reconciliation_evidence_ref,
    }),
  ]);
}

export function createOffboardingEvidenceSourceVersions(caseInput = {}, {
  matter_source_version: matterSourceVersion,
  access_source_version: accessSourceVersion,
} = {}) {
  const offboarding = createOffboardingCase(caseInput);
  return Object.freeze(Object.fromEntries([
    ...offboarding.access_revocations.map((item) => [
      `access_revocation:${item.system_ref}`,
      accessSourceVersion ?? createOffboardingSourceVersion(item),
    ]),
    ...offboarding.document_returns.map((item) => [
      `document_return:${item.document_ref}`,
      createOffboardingSourceVersion(item),
    ]),
    ...offboarding.legal_hold_checks.map((item) => [
      `legal_hold:${item.hold_ref}`,
      createOffboardingSourceVersion(item),
    ]),
    ...offboarding.matter_reassignments.map((item) => [
      `matter_reassignment:${item.matter_id}`,
      matterSourceVersion ?? createOffboardingSourceVersion(item),
    ]),
    ...offboarding.handover_items.map((item) => [
      `handover:${item.item_id}`,
      createOffboardingSourceVersion(item),
    ]),
    [
      `leave_reconciliation:${offboarding.employee_id}`,
      createOffboardingSourceVersion({
        employee_id: offboarding.employee_id,
        separation_date: offboarding.separation_date,
        leave_reconciliation_status: offboarding.leave_reconciliation_status,
      }),
    ],
  ]));
}

export function assertOffboardingEvidenceRecorder({
  offboarding,
  actor_id: actorId,
  subject_actor_ids: subjectActorIds = [],
} = {}) {
  const current = createOffboardingCase(offboarding);
  const actor = requiredString({ actor_id: actorId }, "actor_id");
  const blockedActors = new Set([current.employee_id, ...subjectActorIds]);
  if (blockedActors.has(actor)) {
    const error = new Error("Offboarding evidence must be confirmed by another person");
    error.status = 409;
    error.safe_error_code = HRX_OFFBOARDING_SELF_CONFIRMATION_BLOCKED;
    throw error;
  }
  return true;
}

export function evaluateOperationalOffboardingClose({
  offboarding: caseInput,
  evidence_receipts: evidenceReceipts = [],
  active_matter_assignments: activeMatterAssignments = [],
  source_versions: sourceVersions = {},
  subject_actor_ids: subjectActorIds = [],
  as_of: asOf = new Date().toISOString(),
} = {}) {
  const offboarding = createOffboardingCase(caseInput);
  const currentEvidence = currentOffboardingEvidence(evidenceReceipts, {
    tenant_id: offboarding.tenant_id,
    offboarding_id: offboarding.offboarding_id,
  });
  const blockers = [];
  const readiness = evaluateOffboardingReadiness(offboarding);
  if (!readiness.ready) {
    blockers.push(Object.freeze({
      code: "offboarding_readiness_incomplete",
      category: "case",
      subject_ref: offboarding.offboarding_id,
    }));
  }
  for (const assignment of activeMatterAssignments) {
    blockers.push(Object.freeze({
      code: "active_matter_assignment",
      category: "matter_reassignment",
      subject_ref: assignment.matter_id,
    }));
  }
  const blockedActors = new Set([offboarding.employee_id, ...subjectActorIds]);
  for (const pointer of offboardingEvidencePointers(offboarding)) {
    const key = `${pointer.category}:${pointer.subject_ref}`;
    const current = currentEvidence.get(key);
    if (!pointer.evidence_ref) {
      blockers.push(Object.freeze({ code: "evidence_ref_missing", ...pointer }));
      continue;
    }
    if (!current || current.evidence_ref !== pointer.evidence_ref) {
      blockers.push(Object.freeze({ code: "evidence_not_current", ...pointer }));
      continue;
    }
    if (current.state !== "confirmed") {
      blockers.push(Object.freeze({ code: "evidence_not_confirmed", ...pointer }));
    }
    if (current.valid_until <= asOf) {
      blockers.push(Object.freeze({ code: "evidence_expired", ...pointer }));
    }
    if (blockedActors.has(current.recorded_by_actor_id)) {
      blockers.push(Object.freeze({ code: "self_confirmation", ...pointer }));
    }
    const expectedSourceVersion = sourceVersions[key];
    if (!expectedSourceVersion) {
      blockers.push(Object.freeze({ code: "evidence_source_missing", ...pointer }));
    } else if (current.source_version !== expectedSourceVersion) {
      blockers.push(Object.freeze({ code: "evidence_source_stale", ...pointer }));
    }
  }
  return Object.freeze({
    ready: blockers.length === 0,
    offboarding_id: offboarding.offboarding_id,
    readiness,
    blockers: Object.freeze(blockers),
  });
}

export function assertOperationalOffboardingClose(input = {}) {
  const decision = evaluateOperationalOffboardingClose(input);
  if (decision.ready) return decision;
  const error = new Error("Offboarding operational blockers must be cleared before close");
  error.status = 409;
  error.safe_error_code = HRX_OFFBOARDING_OPERATIONAL_CLOSE_BLOCKED;
  error.decision = decision;
  throw error;
}
