import assert from "node:assert/strict";
import test from "node:test";
import {
  HRX_OFFBOARDING_OPERATIONAL_CLOSE_BLOCKED,
  HRX_OFFBOARDING_SELF_CONFIRMATION_BLOCKED,
  assertOffboardingEvidenceRecorder,
  assertOperationalOffboardingClose,
  createOffboardingEvidenceReceipt,
  createOffboardingEvidenceSourceVersions,
  offboardingEvidencePointers,
} from "../src/offboarding-evidence.js";
import { createOffboardingCase } from "../src/offboarding.js";

const offboarding = createOffboardingCase({
  tenant_id: "tenant-a",
  offboarding_id: "off-evidence",
  employee_id: "emp-departing",
  separation_date: "2026-08-31",
  state: "open",
  leave_reconciliation_status: "approved_and_synced",
  leave_reconciliation_evidence_ref: "evidence:leave",
  access_revocations: [{
    system_ref: "IdP:core",
    revoked: true,
    confirmation_ref: "evidence:access",
  }],
  document_returns: [{
    document_ref: "Asset:laptop",
    returned: true,
    evidence_ref: "evidence:document",
  }],
  legal_hold_checks: [{
    hold_ref: "LegalHold:none",
    clear: true,
    evidence_ref: "evidence:hold",
  }],
  matter_reassignments: [{
    matter_id: "matter-001",
    reassigned_to_employee_id: "emp-successor",
    reassigned: true,
    handover_ref: "evidence:matter",
  }],
  handover_items: [{
    item_id: "handover-001",
    title: "담당 사건 인수인계",
    completed: true,
    evidence_ref: "evidence:handover",
  }],
});

const sourceVersions = createOffboardingEvidenceSourceVersions(offboarding, {
  matter_source_version: "matter-source:v2",
  access_source_version: "access-source:v2",
});

function confirmedReceipts(overrides = {}) {
  return offboardingEvidencePointers(offboarding).map((pointer, index) =>
    createOffboardingEvidenceReceipt({
      tenant_id: offboarding.tenant_id,
      receipt_id: `receipt:${pointer.category}:${index}`,
      evidence_ref: pointer.evidence_ref,
      offboarding_id: offboarding.offboarding_id,
      category: pointer.category,
      subject_ref: pointer.subject_ref,
      state: "confirmed",
      source_version: sourceVersions[`${pointer.category}:${pointer.subject_ref}`],
      recorded_at: `2026-07-${String(index + 10).padStart(2, "0")}T01:00:00.000Z`,
      valid_until: "2026-09-01T00:00:00.000Z",
      recorded_by_actor_id: "people-ops-reviewer",
      ...overrides,
    }));
}

function captureError(callback) {
  try {
    callback();
  } catch (error) {
    return error;
  }
  assert.fail("expected callback to throw");
}

test("operational offboarding blocks one active Matter and closes after current independent evidence", () => {
  assert.throws(
    () =>
      assertOperationalOffboardingClose({
        offboarding,
        evidence_receipts: confirmedReceipts(),
        active_matter_assignments: [{ matter_id: "matter-001", employee_id: "emp-departing" }],
        source_versions: sourceVersions,
        subject_actor_ids: ["iam-departing"],
        as_of: "2026-08-01T00:00:00.000Z",
      }),
    (error) =>
      error.safe_error_code === HRX_OFFBOARDING_OPERATIONAL_CLOSE_BLOCKED &&
      error.decision.blockers.some((blocker) => blocker.code === "active_matter_assignment"),
  );

  const ready = assertOperationalOffboardingClose({
    offboarding,
    evidence_receipts: confirmedReceipts(),
    active_matter_assignments: [],
    source_versions: sourceVersions,
    subject_actor_ids: ["iam-departing"],
    as_of: "2026-08-01T00:00:00.000Z",
  });
  assert.equal(ready.ready, true);
});

test("operational offboarding rejects stale, expired, and self-confirmed evidence", () => {
  const currentReplacement = createOffboardingEvidenceReceipt({
    ...confirmedReceipts()[0],
    receipt_id: "receipt:access:newer",
    evidence_ref: "evidence:access:newer",
    recorded_at: "2026-07-31T01:00:00.000Z",
  });
  const stale = captureError(() =>
    assertOperationalOffboardingClose({
      offboarding,
      evidence_receipts: [...confirmedReceipts(), currentReplacement],
      source_versions: sourceVersions,
      as_of: "2026-08-01T00:00:00.000Z",
    }));
  assert.equal(stale.decision.blockers.some((blocker) => blocker.code === "evidence_not_current"), true);

  const expired = captureError(() =>
    assertOperationalOffboardingClose({
      offboarding,
      evidence_receipts: confirmedReceipts({ valid_until: "2026-07-31T23:59:59.000Z" }),
      source_versions: sourceVersions,
      as_of: "2026-08-01T00:00:00.000Z",
    }));
  assert.equal(expired.decision.blockers.some((blocker) => blocker.code === "evidence_expired"), true);

  const selfConfirmed = captureError(() =>
    assertOperationalOffboardingClose({
      offboarding,
      evidence_receipts: confirmedReceipts({ recorded_by_actor_id: "iam-departing" }),
      source_versions: sourceVersions,
      subject_actor_ids: ["iam-departing"],
      as_of: "2026-08-01T00:00:00.000Z",
    }));
  assert.equal(selfConfirmed.decision.blockers.some((blocker) => blocker.code === "self_confirmation"), true);
});

test("operational offboarding fails closed when a source version is missing or mismatched", () => {
  const missing = captureError(() =>
    assertOperationalOffboardingClose({
      offboarding,
      evidence_receipts: confirmedReceipts(),
      source_versions: {},
      as_of: "2026-08-01T00:00:00.000Z",
    }));
  assert.equal(
    missing.decision.blockers.some(
      (blocker) => blocker.code === "evidence_source_missing",
    ),
    true,
  );

  const accessKey = `access_revocation:${offboarding.access_revocations[0].system_ref}`;
  const mismatched = captureError(() =>
    assertOperationalOffboardingClose({
      offboarding,
      evidence_receipts: confirmedReceipts(),
      source_versions: {
        ...sourceVersions,
        [accessKey]: "access-source:changed",
      },
      as_of: "2026-08-01T00:00:00.000Z",
    }));
  assert.equal(
    mismatched.decision.blockers.some(
      (blocker) =>
        blocker.code === "evidence_source_stale" &&
        blocker.category === "access_revocation",
    ),
    true,
  );
});

test("departing employee or linked account cannot confirm its own evidence", () => {
  assert.throws(
    () =>
      assertOffboardingEvidenceRecorder({
        offboarding,
        actor_id: "iam-departing",
        subject_actor_ids: ["iam-departing"],
      }),
    (error) => error.safe_error_code === HRX_OFFBOARDING_SELF_CONFIRMATION_BLOCKED,
  );
  assert.equal(
    assertOffboardingEvidenceRecorder({
      offboarding,
      actor_id: "people-ops-reviewer",
      subject_actor_ids: ["iam-departing"],
    }),
    true,
  );
});
