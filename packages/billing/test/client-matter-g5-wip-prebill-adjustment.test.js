import assert from "node:assert/strict";
import test from "node:test";

import {
  createBillingG5AdjustmentWorkflowDescriptor,
  createBillingG5BWipPrebillAdjustmentCloseoutDescriptor,
  createBillingG5PreBillDescriptor,
  createBillingG5WipGenerationDescriptor,
  createBillingG5WipLockSnapshotDescriptor,
} from "../src/index.js";

const tenant_id = "tenant_g5b_validator";
const matter_id = "matter_g5b";

function approvedTime(overrides = {}) {
  return {
    time_entry_id: "time_g5b_001",
    tenant_id,
    matter_id,
    status: "approved",
    billable: true,
    amount: 900,
    ...overrides,
  };
}

function wipItem(overrides = {}) {
  return {
    wip_item_id: "wip_g5b_001",
    tenant_id,
    matter_id,
    source_ref: "time_g5b_001",
    amount: 900,
    status: "open",
    ...overrides,
  };
}

function snapshot(overrides = {}) {
  return {
    snapshot_id: "snapshot_g5b_001",
    tenant_id,
    matter_id,
    locked_at: "2026-06-19T07:00:00Z",
    item_refs: ["wip_g5b_001"],
    checksum: "sha256:g5b",
    ...overrides,
  };
}

function prebill(overrides = {}) {
  return {
    prebill_id: "prebill_g5b_001",
    tenant_id,
    matter_id,
    snapshot_id: "snapshot_g5b_001",
    review_status: "partner_review_required",
    partner_reviewer_id: "partner_g5b",
    ...overrides,
  };
}

function adjustment(overrides = {}) {
  return {
    adjustment_id: "adjustment_g5b_001",
    tenant_id,
    matter_id,
    prebill_id: "prebill_g5b_001",
    adjustment_type: "write_down",
    amount: 100,
    reason_code: "client_discount",
    approval_status: "approved",
    approver_id: "partner_g5b",
    ...overrides,
  };
}

test("G5-B WIP generation descriptor only accepts approved billable source rows", () => {
  const descriptor = createBillingG5WipGenerationDescriptor({
    tenant_id,
    matter_id,
    source_items: [approvedTime()],
  });

  assert.equal(descriptor.outcome, "review_required");
  assert.equal(descriptor.approved_billable_item_count, 1);
  assert.deepEqual(descriptor.projected_wip_item_refs, ["time_g5b_001"]);
  assert.equal(descriptor.wip_generation_receipt.wip_persisted, false);

  const blocked = createBillingG5WipGenerationDescriptor({
    tenant_id,
    matter_id,
    source_items: [approvedTime({ status: "draft" })],
  });

  assert.equal(blocked.outcome, "blocked");
  assert.ok(blocked.blocked_claims.includes("wip_generation_approved_source_required"));
  assert.ok(blocked.blocked_claims.includes("wip_generation_unapproved_source_blocked"));
});

test("G5-B WIP lock snapshot descriptor requires immutable PreBill snapshot evidence", () => {
  const descriptor = createBillingG5WipLockSnapshotDescriptor({
    tenant_id,
    matter_id,
    wip_items: [wipItem()],
    snapshot: snapshot(),
  });

  assert.equal(descriptor.outcome, "review_required");
  assert.equal(descriptor.snapshot_item_ref_count, 1);
  assert.equal(descriptor.snapshot_receipt.prebill_snapshot_immutable_tested, true);
  assert.equal(descriptor.snapshot_receipt.snapshot_persisted, false);

  const blocked = createBillingG5WipLockSnapshotDescriptor({
    tenant_id,
    matter_id,
    wip_items: [wipItem()],
    snapshot: snapshot({ item_refs: [], mutates_source_items: true }),
  });

  assert.equal(blocked.outcome, "blocked");
  assert.ok(blocked.blocked_claims.includes("wip_lock_snapshot_item_ref_mismatch"));
  assert.ok(blocked.blocked_claims.includes("wip_lock_snapshot_immutable_required"));
});

test("G5-B PreBill descriptor requires partner review before invoice creation", () => {
  const descriptor = createBillingG5PreBillDescriptor({
    tenant_id,
    matter_id,
    prebill: prebill(),
    snapshot: snapshot(),
  });

  assert.equal(descriptor.outcome, "review_required");
  assert.equal(descriptor.prebill_receipt.partner_review_tested, true);
  assert.equal(descriptor.prebill_receipt.invoice_created, false);

  const blocked = createBillingG5PreBillDescriptor({
    tenant_id,
    matter_id,
    prebill: prebill({ review_status: "draft", partner_reviewer_id: "" }),
    snapshot: snapshot(),
  });

  assert.equal(blocked.outcome, "blocked");
  assert.ok(blocked.blocked_claims.includes("prebill_partner_review_required"));
  assert.ok(blocked.blocked_claims.includes("prebill_partner_reviewer_required"));
});

test("G5-B adjustment workflow descriptor requires write-down/write-off approval", () => {
  const descriptor = createBillingG5AdjustmentWorkflowDescriptor({
    tenant_id,
    matter_id,
    adjustment: adjustment(),
    prebill: prebill(),
  });

  assert.equal(descriptor.outcome, "review_required");
  assert.equal(descriptor.adjustment_receipt.approval_required_tested, true);
  assert.equal(descriptor.adjustment_receipt.issued_invoice_mutated, false);

  const blocked = createBillingG5AdjustmentWorkflowDescriptor({
    tenant_id,
    matter_id,
    adjustment: adjustment({
      approval_status: "pending",
      approver_id: "",
      mutates_issued_invoice: true,
    }),
    prebill: prebill(),
  });

  assert.equal(blocked.outcome, "blocked");
  assert.ok(blocked.blocked_claims.includes("adjustment_approval_required"));
  assert.ok(blocked.blocked_claims.includes("adjustment_issued_invoice_mutation_blocked"));
});

test("G5-B closeout descriptor summarizes WIP PreBill adjustment evidence", () => {
  const wip = createBillingG5WipGenerationDescriptor({
    tenant_id,
    matter_id,
    source_items: [approvedTime()],
  });
  const locked = createBillingG5WipLockSnapshotDescriptor({
    tenant_id,
    matter_id,
    wip_items: [wipItem()],
    snapshot: snapshot(),
  });
  const review = createBillingG5PreBillDescriptor({
    tenant_id,
    matter_id,
    prebill: prebill(),
    snapshot: snapshot(),
  });
  const approvedAdjustment = createBillingG5AdjustmentWorkflowDescriptor({
    tenant_id,
    matter_id,
    adjustment: adjustment(),
    prebill: prebill(),
  });

  const closeout = createBillingG5BWipPrebillAdjustmentCloseoutDescriptor({
    tenant_id,
    descriptors: [wip, locked, review, approvedAdjustment],
  });

  assert.equal(closeout.outcome, "review_required");
  assert.deepEqual(closeout.tuw_coverage, [
    "LFOS-G5-W07-T007",
    "LFOS-G5-W07-T008",
    "LFOS-G5-W07-T009",
    "LFOS-G5-W07-T010",
  ]);
  assert.equal(closeout.approved_time_creates_wip_tested, true);
  assert.equal(closeout.prebill_snapshot_immutable_tested, true);
  assert.equal(closeout.partner_review_tested, true);
  assert.equal(closeout.adjustment_approval_tested, true);
  assert.equal(closeout.closeout_receipt.runtime_readiness_claim, "open");
});
