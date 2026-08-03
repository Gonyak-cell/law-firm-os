import assert from "node:assert/strict";
import test from "node:test";
import {
  applyWriteDownOff,
  createFinanceRepository,
  createInvoiceFromPreBill,
  createPreBill,
} from "../src/index.js";

const TENANT = "tenant-prebill-adjustment-boundaries";
const MATTER = "matter-prebill-adjustment-boundaries";
const ACTOR = "partner-prebill-adjustment-boundaries";

function createReviewPreBill(repository, suffix, totalAmount = 100) {
  const snapshotId = `snapshot-${suffix}`;
  repository.create({
    model_type: "WipSnapshot",
    wip_snapshot_id: snapshotId,
    tenant_id: TENANT,
    matter_id: `${MATTER}-${suffix}`,
    immutable_snapshot: true,
    total_amount: totalAmount,
  });
  return createPreBill({
    repository,
    prebill: {
      prebill_id: `prebill-${suffix}`,
      tenant_id: TENANT,
      matter_id: `${MATTER}-${suffix}`,
      wip_snapshot_id: snapshotId,
      partner_reviewer_id: ACTOR,
    },
    actor_id: ACTOR,
    idempotency_key: `prebill-${suffix}-create`,
  }).prebill;
}

test("write-down above the canonical PreBill balance is rejected without side effects", () => {
  const repository = createFinanceRepository();
  const prebill = createReviewPreBill(repository, "over-limit");
  const before = repository.snapshot();
  const request = {
    repository,
    adjustment: {
      adjustment_id: "adjustment-over-limit",
      tenant_id: TENANT,
      prebill_id: prebill.prebill_id,
      reason_code: "partner_write_down",
      amount: 150,
    },
    actor_id: ACTOR,
    idempotency_key: "adjustment-over-limit",
  };
  let accepted;
  let rejection;

  try {
    accepted = applyWriteDownOff(request);
  } catch (error) {
    rejection = error;
  }

  assert.match(
    rejection?.message ?? "",
    /adjustment amount exceeds PreBill remaining amount/,
    `over-adjustment was accepted: ${JSON.stringify({
      total_amount: accepted?.prebill.total_amount,
      adjustments_total: accepted?.prebill.adjustments_total,
      status: accepted?.prebill.status,
    })}`,
  );
  assert.equal(accepted, undefined);
  assert.deepEqual(repository.snapshot(), before);
  const corrected = applyWriteDownOff({
    ...request,
    adjustment: { ...request.adjustment, amount: 75 },
  });
  assert.equal(corrected.idempotent_replay, false);
  assert.equal(corrected.prebill.total_amount, 25);
  assert.equal(corrected.prebill.adjustments_total, 75);
});

test("zero and negative write-downs are rejected before idempotency or product writes", () => {
  const repository = createFinanceRepository();
  const prebill = createReviewPreBill(repository, "non-positive");
  const before = repository.snapshot();

  for (const amount of [0, -1]) {
    assert.throws(
      () => applyWriteDownOff({
        repository,
        adjustment: {
          adjustment_id: `adjustment-non-positive-${amount}`,
          tenant_id: TENANT,
          prebill_id: prebill.prebill_id,
          reason_code: "partner_write_down",
          amount,
        },
        actor_id: ACTOR,
        idempotency_key: `adjustment-non-positive-${amount}`,
      }),
      /adjustment amount must be positive/,
    );
    assert.deepEqual(repository.snapshot(), before);
  }
});

test("an exact-balance write-down approves once, replays exactly, and rejects a changed payload", () => {
  const repository = createFinanceRepository();
  const prebill = createReviewPreBill(repository, "exact-balance");
  const request = {
    repository,
    adjustment: {
      adjustment_id: "adjustment-exact-balance",
      tenant_id: TENANT,
      prebill_id: prebill.prebill_id,
      reason_code: "partner_write_down",
      amount: 100,
    },
    actor_id: ACTOR,
    idempotency_key: "adjustment-exact-balance",
  };

  const approved = applyWriteDownOff(request);
  assert.deepEqual(
    {
      total_amount: approved.prebill.total_amount,
      adjustments_total: approved.prebill.adjustments_total,
      adjustment_total: approved.prebill.adjustment_total,
      status: approved.prebill.status,
    },
    {
      total_amount: 0,
      adjustments_total: 100,
      adjustment_total: 100,
      status: "partner_approved",
    },
  );
  const afterApproval = repository.snapshot();
  assert.equal(applyWriteDownOff(request).idempotent_replay, true);
  assert.deepEqual(repository.snapshot(), afterApproval);
  assert.throws(
    () => applyWriteDownOff({
      ...request,
      adjustment: { ...request.adjustment, amount: 99 },
    }),
    {
      code: "FINANCE_IDEMPOTENCY_CONFLICT",
      message: "idempotency key was already used for a different finance request",
    },
  );
  assert.deepEqual(repository.snapshot(), afterApproval);
});

test("the public PreBill lifecycle permits one adjustment and rejects a second without writes", () => {
  const repository = createFinanceRepository();
  const prebill = createReviewPreBill(repository, "single-adjustment");
  const approved = applyWriteDownOff({
    repository,
    adjustment: {
      adjustment_id: "adjustment-single-first",
      tenant_id: TENANT,
      prebill_id: prebill.prebill_id,
      reason_code: "partner_write_down",
      amount: 40,
    },
    actor_id: ACTOR,
    idempotency_key: "adjustment-single-first",
  });
  assert.equal(approved.prebill.total_amount, 60);
  assert.equal(approved.prebill.adjustments_total, 40);
  assert.equal(approved.prebill.status, "partner_approved");
  const afterFirstAdjustment = repository.snapshot();
  assert.equal(afterFirstAdjustment.records.filter((record) => record.model_type === "BillingAdjustment").length, 1);

  assert.throws(
    () => applyWriteDownOff({
      repository,
      adjustment: {
        adjustment_id: "adjustment-single-second",
        tenant_id: TENANT,
        prebill_id: prebill.prebill_id,
        reason_code: "partner_write_down",
        amount: 20,
      },
      actor_id: ACTOR,
      idempotency_key: "adjustment-single-second",
    }),
    /invalid PreBill transition: partner_approved -> approve_with_adjustment/,
  );
  assert.deepEqual(repository.snapshot(), afterFirstAdjustment);
});

test("a normal bounded write-down keeps the approved PreBill to Invoice contract", () => {
  const repository = createFinanceRepository();
  const prebill = createReviewPreBill(repository, "invoice-link");
  const approved = applyWriteDownOff({
    repository,
    adjustment: {
      adjustment_id: "adjustment-invoice-link",
      tenant_id: TENANT,
      prebill_id: prebill.prebill_id,
      reason_code: "partner_write_down",
      amount: 25,
    },
    actor_id: ACTOR,
    idempotency_key: "adjustment-invoice-link",
  });
  const issued = createInvoiceFromPreBill({
    repository,
    invoice: {
      invoice_id: "invoice-adjustment-link",
      tenant_id: TENANT,
      matter_id: prebill.matter_id,
      prebill_id: prebill.prebill_id,
      billing_client_party_id: "client-adjustment-link",
      issued_at: "2026-07-31T00:00:00.000Z",
    },
    actor_id: ACTOR,
    idempotency_key: "invoice-adjustment-link",
  });

  assert.equal(approved.prebill.total_amount, 75);
  assert.equal(issued.invoice.prebill_id, prebill.prebill_id);
  assert.equal(issued.invoice.amount_due, 75);
  assert.equal(issued.invoice.adjustments_total, 25);
  const afterInvoice = repository.snapshot();
  assert.throws(
    () => applyWriteDownOff({
      repository,
      adjustment: {
        adjustment_id: "adjustment-after-invoice-link",
        tenant_id: TENANT,
        prebill_id: prebill.prebill_id,
        reason_code: "late_write_down",
        amount: 1,
      },
      actor_id: ACTOR,
      idempotency_key: "adjustment-after-invoice-link",
    }),
    /PreBill linked to an Invoice is immutable/,
  );
  assert.deepEqual(repository.snapshot(), afterInvoice);
});
