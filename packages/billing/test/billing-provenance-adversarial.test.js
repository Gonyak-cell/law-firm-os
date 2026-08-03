import assert from "node:assert/strict";
import test from "node:test";
import {
  approvePreBillWithoutAdjustment,
  applyWriteDownOff,
  createFinanceRepository,
  createInvoiceFromPreBill,
  createPreBill,
  rejectPreBill,
} from "../src/index.js";

const TENANT = "tenant-billing-provenance";
const MATTER = "matter-billing-provenance";
const ACTOR = "partner-billing-provenance";

function createReviewPreBill(repository, suffix) {
  const matterId = `${MATTER}-${suffix}`;
  const snapshotId = `snapshot-${suffix}`;
  repository.create({
    model_type: "WipSnapshot",
    wip_snapshot_id: snapshotId,
    tenant_id: TENANT,
    matter_id: matterId,
    immutable_snapshot: true,
    total_amount: 100000,
  });
  return createPreBill({
    repository,
    prebill: {
      prebill_id: `prebill-${suffix}`,
      tenant_id: TENANT,
      matter_id: matterId,
      wip_snapshot_id: snapshotId,
      partner_reviewer_id: ACTOR,
    },
    actor_id: ACTOR,
    idempotency_key: `prebill-${suffix}-create`,
  }).prebill;
}

test("forged PreBill and Invoice projections cannot replace immutable snapshot billing values", () => {
  const repository = createFinanceRepository();
  repository.create({
    model_type: "WipSnapshot",
    wip_snapshot_id: "snapshot-provenance",
    tenant_id: TENANT,
    matter_id: MATTER,
    immutable_snapshot: true,
    total_amount: 100000,
    standard_amount: 120000,
    retainer_drawdown_total: 20000,
    success_fee_applied: true,
    fee_arrangement_id: "fee-canonical",
    fee_arrangement_type: "success_fee",
    item_snapshots: [{ wip_item_id: "wip-canonical", currency: "KRW" }],
  });

  const created = createPreBill({
    repository,
    prebill: {
      prebill_id: "prebill-provenance",
      tenant_id: TENANT,
      matter_id: MATTER,
      wip_snapshot_id: "snapshot-provenance",
      partner_reviewer_id: ACTOR,
      status: "partner_approved",
      total_amount: 1,
      standard_amount: 1,
      retainer_drawdown_total: 0,
      success_fee_applied: false,
      fee_arrangement_id: "fee-forged",
      fee_arrangement_type: "hourly",
      currency: "USD",
      adjustments_total: 99999,
      adjustment_total: 99999,
      approved_without_adjustment: true,
      partner_approved_by: "attacker",
    },
    actor_id: ACTOR,
    idempotency_key: "prebill-provenance-create",
  });
  assert.deepEqual(
    {
      status: created.prebill.status,
      total_amount: created.prebill.total_amount,
      standard_amount: created.prebill.standard_amount,
      retainer_drawdown_total: created.prebill.retainer_drawdown_total,
      success_fee_applied: created.prebill.success_fee_applied,
      fee_arrangement_id: created.prebill.fee_arrangement_id,
      fee_arrangement_type: created.prebill.fee_arrangement_type,
      currency: created.prebill.currency,
      adjustments_total: created.prebill.adjustments_total,
      adjustment_total: created.prebill.adjustment_total,
      approved_without_adjustment: created.prebill.approved_without_adjustment,
      partner_approved_by: created.prebill.partner_approved_by,
    },
    {
      status: "partner_review_required",
      total_amount: 100000,
      standard_amount: 120000,
      retainer_drawdown_total: 20000,
      success_fee_applied: true,
      fee_arrangement_id: "fee-canonical",
      fee_arrangement_type: "success_fee",
      currency: "KRW",
      adjustments_total: 0,
      adjustment_total: 0,
      approved_without_adjustment: false,
      partner_approved_by: null,
    },
  );

  const adjustmentRequest = {
    repository,
    adjustment: {
      adjustment_id: "adjustment-provenance",
      tenant_id: TENANT,
      prebill_id: created.prebill.prebill_id,
      reason_code: "partner_write_down",
      amount: 10000,
    },
    actor_id: ACTOR,
    idempotency_key: "adjustment-provenance",
  };
  const adjusted = applyWriteDownOff(adjustmentRequest);
  assert.equal(adjusted.prebill.total_amount, 90000);
  assert.equal(adjusted.audit_event.action, "prebill.adjustment.approve");

  const baseInvoice = {
    tenant_id: TENANT,
    matter_id: MATTER,
    prebill_id: created.prebill.prebill_id,
    billing_client_party_id: "client-provenance",
  };
  for (const [field, value] of Object.entries({
    amount_due: 1,
    standard_amount: 1,
    retainer_drawdown_total: 0,
    success_fee_applied: false,
    fee_arrangement_id: "fee-forged",
    fee_arrangement_type: "hourly",
    currency: "USD",
    adjustments_total: 0,
    adjustment_total: 0,
  })) {
    assert.throws(
      () => createInvoiceFromPreBill({
        repository,
        invoice: {
          ...baseInvoice,
          invoice_id: `invoice-forged-${field}`,
          [field]: value,
        },
        actor_id: ACTOR,
        idempotency_key: `invoice-forged-${field}`,
      }),
      new RegExp(`invoice ${field} must match partner-approved PreBill`),
    );
  }

  const issued = createInvoiceFromPreBill({
    repository,
    invoice: {
      ...baseInvoice,
      invoice_id: "invoice-provenance",
      issued_at: "2026-07-31T00:00:00.000Z",
    },
    actor_id: ACTOR,
    idempotency_key: "invoice-provenance",
  });
  assert.deepEqual(
    {
      amount_due: issued.invoice.amount_due,
      outstanding_amount: issued.invoice.outstanding_amount,
      standard_amount: issued.invoice.standard_amount,
      retainer_drawdown_total: issued.invoice.retainer_drawdown_total,
      success_fee_applied: issued.invoice.success_fee_applied,
      fee_arrangement_id: issued.invoice.fee_arrangement_id,
      fee_arrangement_type: issued.invoice.fee_arrangement_type,
      currency: issued.invoice.currency,
      adjustments_total: issued.invoice.adjustments_total,
      adjustment_total: issued.invoice.adjustment_total,
    },
    {
      amount_due: 90000,
      outstanding_amount: 90000,
      standard_amount: 120000,
      retainer_drawdown_total: 20000,
      success_fee_applied: true,
      fee_arrangement_id: "fee-canonical",
      fee_arrangement_type: "success_fee",
      currency: "KRW",
      adjustments_total: 10000,
      adjustment_total: 10000,
    },
  );

  assert.equal(applyWriteDownOff(adjustmentRequest).idempotent_replay, true);
  assert.throws(
    () => applyWriteDownOff({
      repository,
      adjustment: {
        adjustment_id: "adjustment-after-invoice",
        tenant_id: TENANT,
        prebill_id: created.prebill.prebill_id,
        reason_code: "late_write_down",
        amount: 10000,
      },
      actor_id: ACTOR,
      idempotency_key: "adjustment-after-invoice",
    }),
    /PreBill linked to an Invoice is immutable/,
  );
  assert.throws(
    () => approvePreBillWithoutAdjustment({
      repository,
      tenant_id: TENANT,
      prebill_id: created.prebill.prebill_id,
      actor_id: ACTOR,
      idempotency_key: "approve-after-invoice",
    }),
    /PreBill linked to an Invoice is immutable/,
  );
  assert.throws(
    () => rejectPreBill({
      repository,
      tenant_id: TENANT,
      prebill_id: created.prebill.prebill_id,
      reason_code: "late_rejection",
      actor_id: ACTOR,
      idempotency_key: "reject-after-invoice",
    }),
    /PreBill linked to an Invoice is immutable/,
  );

  const persistedPreBill = repository.get({
    tenant_id: TENANT,
    model_type: "PreBill",
    prebill_id: created.prebill.prebill_id,
  });
  const persistedInvoice = repository.get({
    tenant_id: TENANT,
    model_type: "Invoice",
    invoice_id: issued.invoice.invoice_id,
  });
  assert.equal(repository.list({ tenant_id: TENANT, model_type: "BillingAdjustment" }).length, 1);
  assert.equal(persistedPreBill.status, "partner_approved");
  assert.equal(persistedPreBill.total_amount, 90000);
  assert.equal(persistedInvoice.amount_due, 90000);
  assert.equal(persistedInvoice.outstanding_amount, 90000);
});

test("PreBill review commands preserve idempotency and reject terminal-state transitions", () => {
  const repository = createFinanceRepository();
  const approvedPreBill = createReviewPreBill(repository, "approved-state");
  const approvalRequest = {
    repository,
    tenant_id: TENANT,
    prebill_id: approvedPreBill.prebill_id,
    actor_id: ACTOR,
    idempotency_key: "prebill-approved-state-approve",
  };
  assert.equal(approvePreBillWithoutAdjustment(approvalRequest).prebill.status, "partner_approved");
  assert.equal(approvePreBillWithoutAdjustment(approvalRequest).idempotent_replay, true);
  assert.throws(
    () => approvePreBillWithoutAdjustment({
      ...approvalRequest,
      idempotency_key: "prebill-approved-state-approve-again",
    }),
    /invalid PreBill transition: partner_approved -> approve_without_adjustment/,
  );
  assert.throws(
    () => rejectPreBill({
      repository,
      tenant_id: TENANT,
      prebill_id: approvedPreBill.prebill_id,
      reason_code: "duplicate_review",
      actor_id: ACTOR,
      idempotency_key: "prebill-approved-state-reject",
    }),
    /invalid PreBill transition: partner_approved -> reject/,
  );
  assert.throws(
    () => applyWriteDownOff({
      repository,
      adjustment: {
        adjustment_id: "adjustment-approved-state",
        tenant_id: TENANT,
        prebill_id: approvedPreBill.prebill_id,
        reason_code: "duplicate_review",
        amount: 10000,
      },
      actor_id: ACTOR,
      idempotency_key: "adjustment-approved-state",
    }),
    /invalid PreBill transition: partner_approved -> approve_with_adjustment/,
  );

  const rejectedPreBill = createReviewPreBill(repository, "rejected-state");
  const rejectionRequest = {
    repository,
    tenant_id: TENANT,
    prebill_id: rejectedPreBill.prebill_id,
    reason_code: "partner_rejected",
    actor_id: ACTOR,
    idempotency_key: "prebill-rejected-state-reject",
  };
  assert.equal(rejectPreBill(rejectionRequest).prebill.status, "rejected");
  assert.equal(rejectPreBill(rejectionRequest).idempotent_replay, true);
  assert.throws(
    () => approvePreBillWithoutAdjustment({
      repository,
      tenant_id: TENANT,
      prebill_id: rejectedPreBill.prebill_id,
      actor_id: ACTOR,
      idempotency_key: "prebill-rejected-state-approve",
    }),
    /invalid PreBill transition: rejected -> approve_without_adjustment/,
  );
  assert.throws(
    () => rejectPreBill({
      ...rejectionRequest,
      idempotency_key: "prebill-rejected-state-reject-again",
    }),
    /invalid PreBill transition: rejected -> reject/,
  );
  assert.throws(
    () => applyWriteDownOff({
      repository,
      adjustment: {
        adjustment_id: "adjustment-rejected-state",
        tenant_id: TENANT,
        prebill_id: rejectedPreBill.prebill_id,
        reason_code: "resubmit_required",
        amount: 10000,
      },
      actor_id: ACTOR,
      idempotency_key: "adjustment-rejected-state",
    }),
    /invalid PreBill transition: rejected -> approve_with_adjustment/,
  );

  assert.equal(repository.list({ tenant_id: TENANT, model_type: "BillingAdjustment" }).length, 0);
  assert.equal(
    repository.get({ tenant_id: TENANT, model_type: "PreBill", prebill_id: approvedPreBill.prebill_id }).status,
    "partner_approved",
  );
  assert.equal(
    repository.get({ tenant_id: TENANT, model_type: "PreBill", prebill_id: rejectedPreBill.prebill_id }).status,
    "rejected",
  );
});
