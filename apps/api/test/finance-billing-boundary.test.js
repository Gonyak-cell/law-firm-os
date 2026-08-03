import assert from "node:assert/strict";
import test from "node:test";
import { createFinanceRepository } from "../../../packages/billing/src/finance-repository.js";
import {
  FINANCE_API_ERROR_CODES,
  createFinanceRuntimeContext,
  handleFinanceApiRequest,
} from "../src/finance-runtime-context.js";
import {
  financePaymentMatchMatterIds,
  financePaymentAllocationMatterIds,
  runFinanceBillingDisbursementCreate,
  runFinanceBillingExpenseCreate,
  runFinanceBillingFeeArrangementCreate,
  runFinanceBillingInvoiceIssue,
  runFinanceBillingPaymentAllocationCreate,
  runFinanceBillingPaymentImport,
  runFinanceBillingPaymentMatchCreate,
  runFinanceBillingPreBillApprove,
  runFinanceBillingPreBillCreate,
  runFinanceBillingPreBillReject,
  runFinanceBillingTimeEntryApprove,
  runFinanceBillingTimeEntryCreate,
  runFinanceBillingWipGenerate,
  runFinanceBillingWipSnapshotLock,
} from "../src/finance-billing-boundary.js";

const TENANT = "tenant_rfd_tuw_032";
const MATTER = "matter_rfd_tuw_032";
const ACTOR = "actor_rfd_tuw_032";
const CLIENT = "client_rfd_tuw_032";
const COMMON = Object.freeze({
  tenant_id: TENANT,
  permission_ref: "permission_rfd_tuw_032",
  audit_hint_ref: "audit_rfd_tuw_032",
});
const ALLOW_CONTEXT = Object.freeze({
  principal: { user_id: ACTOR, tenant_id: TENANT, role_ids: ["partner"] },
  rules: [{ id: "allow_rfd_tuw_032", effect: "allow", action: "*" }],
  object_acl: [],
});
const DENY_CONTEXT = Object.freeze({
  principal: { user_id: "denied_rfd_tuw_032", tenant_id: TENANT, role_ids: ["staff"] },
  rules: [],
  object_acl: [],
});

function financeWriteContext({ action, deniedMatter = null } = {}) {
  return {
    principal: { user_id: ACTOR, tenant_id: TENANT, role_ids: ["finance_user"] },
    rules: [
      { id: `allow-${action}`, effect: "allow", action },
      ...(deniedMatter ? [{
        id: `deny-${action}-${deniedMatter}`,
        effect: "deny",
        action,
        ethical_wall_matter_id: deniedMatter,
      }] : []),
    ],
    object_acl: [],
  };
}

function assertNoProductWrite(repository, before, { action, auditCount = 0 } = {}) {
  const after = repository.snapshot();
  assert.deepEqual(after.records, before.records);
  assert.deepEqual(after.idempotency, before.idempotency);
  assert.equal(after.audit_events.length, before.audit_events.length + auditCount);
  if (action) {
    assert.equal(after.audit_events.filter((event) => event.action === action).length, 0);
  }
}

function repositoryWithRateCard() {
  return createFinanceRepository({
    seedRecords: [{
      model_type: "RateCard",
      rate_card_id: "rate_rfd_tuw_032",
      tenant_id: TENANT,
      currency: "KRW",
      status: "active",
      role_rates: [{ role_id: "partner", hourly_rate: 300000 }],
    }],
  });
}

function createFlow(repository) {
  const time = runFinanceBillingTimeEntryCreate({
    repository,
    time_entry: {
      time_entry_id: "time_rfd_tuw_032",
      tenant_id: TENANT,
      matter_id: MATTER,
      role_id: "partner",
      work_date: "2026-08-01",
      narrative: "RFD032 billing composition",
      duration_minutes: 60,
      billable: true,
    },
    actor_id: ACTOR,
    idempotency_key: "time-create-rfd032",
  });
  const approved = runFinanceBillingTimeEntryApprove({
    repository,
    tenant_id: TENANT,
    time_entry_id: time.time_entry.time_entry_id,
    actor_id: ACTOR,
    idempotency_key: "time-approve-rfd032",
  });
  const fee = runFinanceBillingFeeArrangementCreate({
    repository,
    fee_arrangement: {
      fee_arrangement_id: "fee_rfd_tuw_032",
      tenant_id: TENANT,
      matter_id: MATTER,
      billing_profile_id: "billing-profile-rfd032",
      rate_card_id: "rate_rfd_tuw_032",
      type: "hourly",
    },
    actor_id: ACTOR,
    idempotency_key: "fee-create-rfd032",
  });
  const wip = runFinanceBillingWipGenerate({
    repository,
    tenant_id: TENANT,
    matter_id: MATTER,
    rate_card_id: fee.fee_arrangement.rate_card_id,
    fee_arrangement_id: fee.fee_arrangement.fee_arrangement_id,
    actor_id: ACTOR,
    idempotency_key: "wip-generate-rfd032",
  });
  const snapshot = runFinanceBillingWipSnapshotLock({
    repository,
    tenant_id: TENANT,
    matter_id: MATTER,
    wip_item_ids: wip.wip_items.map((item) => item.wip_item_id),
    actor_id: ACTOR,
    idempotency_key: "wip-snapshot-rfd032",
  });
  const prebill = runFinanceBillingPreBillCreate({
    repository,
    prebill: {
      prebill_id: "prebill_rfd_tuw_032",
      tenant_id: TENANT,
      matter_id: MATTER,
      wip_snapshot_id: snapshot.wip_snapshot.wip_snapshot_id,
      partner_reviewer_id: ACTOR,
    },
    actor_id: ACTOR,
    idempotency_key: "prebill-create-rfd032",
  });
  const approvedPrebill = runFinanceBillingPreBillApprove({
    repository,
    tenant_id: TENANT,
    prebill_id: prebill.prebill.prebill_id,
    actor_id: ACTOR,
    idempotency_key: "prebill-approve-rfd032",
  });
  const invoice = runFinanceBillingInvoiceIssue({
    repository,
    invoice: {
      invoice_id: "invoice_rfd_tuw_032",
      tenant_id: TENANT,
      matter_id: MATTER,
      prebill_id: approvedPrebill.prebill.prebill_id,
      billing_client_party_id: CLIENT,
    },
    actor_id: ACTOR,
    idempotency_key: "invoice-issue-rfd032",
  });
  return { time, approved, fee, wip, snapshot, prebill, approvedPrebill, invoice };
}

test("RFD-TUW-032 direct billing composition preserves WIP to Invoice lineage and replay", () => {
  const repository = repositoryWithRateCard();
  const flow = createFlow(repository);
  assert.equal(flow.time.time_entry.status, "draft");
  assert.equal(flow.approved.time_entry.approved_for_wip, true);
  assert.equal(flow.wip.wip_items[0].source_id, flow.time.time_entry.time_entry_id);
  assert.equal(flow.snapshot.wip_snapshot.item_refs[0], flow.wip.wip_items[0].wip_item_id);
  assert.equal(flow.prebill.prebill.wip_snapshot_id, flow.snapshot.wip_snapshot.wip_snapshot_id);
  assert.equal(flow.invoice.invoice.prebill_id, flow.prebill.prebill.prebill_id);
  assert.equal(flow.invoice.invoice_lines[0].prebill_id, flow.prebill.prebill.prebill_id);
  const beforeReplay = repository.snapshot();
  const replay = runFinanceBillingInvoiceIssue({
    repository,
    invoice: {
      invoice_id: "invoice_rfd_tuw_032",
      tenant_id: TENANT,
      matter_id: MATTER,
      prebill_id: flow.prebill.prebill.prebill_id,
      billing_client_party_id: CLIENT,
    },
    actor_id: ACTOR,
    idempotency_key: "invoice-issue-rfd032",
  });
  assert.equal(replay.idempotent_replay, true);
  assert.deepEqual(repository.snapshot(), beforeReplay);
});

test("RFD-TUW-032 expense and disbursement composition keeps service receipts and idempotent replay", () => {
  const repository = createFinanceRepository();
  const expenseInput = {
    expense_id: "expense_rfd_tuw_032",
    tenant_id: TENANT,
    matter_id: MATTER,
    receipt_document_id: "receipt-rfd032",
    amount: 12500,
  };
  const firstExpense = runFinanceBillingExpenseCreate({
    repository,
    expense: expenseInput,
    actor_id: ACTOR,
    idempotency_key: "expense-rfd032",
  });
  const firstDisbursement = runFinanceBillingDisbursementCreate({
    repository,
    disbursement: {
      disbursement_id: "disbursement_rfd_tuw_032",
      tenant_id: TENANT,
      matter_id: MATTER,
      vendor_ref: "vendor-rfd032",
      amount: 3000,
    },
    actor_id: ACTOR,
    idempotency_key: "disbursement-rfd032",
  });
  assert.equal(firstExpense.expense.model_type, "Expense");
  assert.equal(firstDisbursement.disbursement.model_type, "Disbursement");
  const beforeReplay = repository.snapshot();
  assert.equal(runFinanceBillingExpenseCreate({ repository, expense: expenseInput, actor_id: ACTOR, idempotency_key: "expense-rfd032" }).idempotent_replay, true);
  assert.equal(runFinanceBillingDisbursementCreate({
    repository,
    disbursement: {
      disbursement_id: "disbursement_rfd_tuw_032",
      tenant_id: TENANT,
      matter_id: MATTER,
      vendor_ref: "vendor-rfd032",
      amount: 3000,
    },
    actor_id: ACTOR,
    idempotency_key: "disbursement-rfd032",
  }).idempotent_replay, true);
  assert.deepEqual(repository.snapshot(), beforeReplay);
});

test("RFD-TUW-032 PreBill composition keeps adjustment and reject transitions in the existing service boundary", () => {
  const repository = createFinanceRepository({
    seedRecords: [{
      model_type: "WipSnapshot",
      wip_snapshot_id: "snapshot_prebill_rfd032",
      tenant_id: TENANT,
      matter_id: MATTER,
      immutable_snapshot: true,
      total_amount: 100,
      currency: "KRW",
    }],
  });
  const prebill = runFinanceBillingPreBillCreate({
    repository,
    prebill: {
      prebill_id: "prebill_adjustment_rfd032",
      tenant_id: TENANT,
      matter_id: MATTER,
      wip_snapshot_id: "snapshot_prebill_rfd032",
      partner_reviewer_id: ACTOR,
    },
    actor_id: ACTOR,
    idempotency_key: "prebill-adjustment-create-rfd032",
  });
  const adjusted = runFinanceBillingPreBillApprove({
    repository,
    body: {
      tenant_id: TENANT,
      prebill_id: prebill.prebill.prebill_id,
      adjustment: {
        adjustment_id: "adjustment_rfd032",
        prebill_id: prebill.prebill.prebill_id,
        adjustment_type: "write_down",
        amount: 25,
        reason_code: "partner_write_down",
      },
    },
    actor_id: ACTOR,
    idempotency_key: "prebill-adjustment-approve-rfd032",
  });
  assert.equal(adjusted.prebill.total_amount, 75);
  assert.equal(adjusted.adjustment.adjustment_id, "adjustment_rfd032");

  const rejectRepository = createFinanceRepository({
    seedRecords: [{
      model_type: "WipSnapshot",
      wip_snapshot_id: "snapshot_reject_rfd032",
      tenant_id: TENANT,
      matter_id: MATTER,
      immutable_snapshot: true,
      total_amount: 50,
      currency: "KRW",
    }],
  });
  const rejectPrebill = runFinanceBillingPreBillCreate({
    repository: rejectRepository,
    prebill: {
      prebill_id: "prebill_reject_rfd032",
      tenant_id: TENANT,
      matter_id: MATTER,
      wip_snapshot_id: "snapshot_reject_rfd032",
      partner_reviewer_id: ACTOR,
    },
    actor_id: ACTOR,
    idempotency_key: "prebill-reject-create-rfd032",
  });
  const rejected = runFinanceBillingPreBillReject({
    repository: rejectRepository,
    tenant_id: TENANT,
    prebill_id: rejectPrebill.prebill.prebill_id,
    reason_code: "needs_revision",
    actor_id: ACTOR,
    idempotency_key: "prebill-reject-rfd032",
  });
  assert.equal(rejected.prebill.status, "rejected");
  assert.equal(rejected.prebill.rejection_reason_code, "needs_revision");
});

test("RFD-TUW-032 payment composition carries invoice allocation and canonical Matter scope", () => {
  const repository = createFinanceRepository({
    seedRecords: [
      {
        model_type: "Invoice",
        invoice_id: "invoice_payment_rfd032",
        tenant_id: TENANT,
        matter_id: MATTER,
        client_group_id: CLIENT,
        amount_due: 100,
        amount_paid: 0,
        outstanding_amount: 100,
        currency: "KRW",
        status: "issued",
      },
    ],
  });
  const payment = runFinanceBillingPaymentImport({
    repository,
    payment: {
      payment_id: "payment_rfd_tuw_032",
      tenant_id: TENANT,
      matter_id: MATTER,
      client_group_id: CLIENT,
      bank_reference: "bank:rfd032",
      amount: 100,
      currency: "KRW",
    },
    actor_id: ACTOR,
    idempotency_key: "payment-import-rfd032",
  });
  const matterIds = financePaymentAllocationMatterIds({
    repository,
    allocation: {
      tenant_id: TENANT,
      payment_id: payment.payment.payment_id,
      invoice_id: "invoice_payment_rfd032",
      allocation_type: "invoice_payment",
      matter_id: MATTER,
    },
    tenant_id: TENANT,
  });
  assert.deepEqual(matterIds, [MATTER]);
  const matched = runFinanceBillingPaymentMatchCreate({
    repository,
    match: {
      payment_match_id: "match_rfd_tuw_032",
      tenant_id: TENANT,
      payment_id: payment.payment.payment_id,
      invoice_id: "invoice_payment_rfd032",
      amount: 100,
      currency: "KRW",
    },
    actor_id: ACTOR,
    idempotency_key: "payment-match-rfd032",
  });
  assert.equal(matched.payment_allocation.invoice_id, "invoice_payment_rfd032");
  assert.equal(matched.invoice.amount_paid, 100);
  assert.equal(matched.payment.allocation_status, "allocated");
  assert.equal(repository.list({ tenant_id: TENANT, model_type: "PaymentMatch" }).length, 1);
  assert.equal(repository.listAudit({ tenant_id: TENANT }).at(-1).action, "payment.match");
});

test("RFD-TUW-032 malformed billing inputs fail before writes", () => {
  const repository = repositoryWithRateCard();
  const before = repository.snapshot();
  assert.throws(
    () => runFinanceBillingWipSnapshotLock({
      repository,
      tenant_id: TENANT,
      matter_id: MATTER,
      wip_item_ids: ["missing-wip-item"],
      actor_id: ACTOR,
      idempotency_key: "snapshot-invalid-rfd032",
    }),
    /WIP snapshot item refs must match source WIP items/,
  );
  assert.throws(
    () => runFinanceBillingFeeArrangementCreate({
      repository,
      fee_arrangement: {
        fee_arrangement_id: "fee-invalid-rfd032",
        tenant_id: TENANT,
        matter_id: MATTER,
        billing_profile_id: "billing-profile-rfd032",
        rate_card_id: "missing-rate-card",
      },
      rate_card: {
        model_type: "RateCard",
        rate_card_id: "different-rate-card",
        tenant_id: TENANT,
        currency: "KRW",
        status: "active",
        role_rates: [],
      },
      actor_id: ACTOR,
      idempotency_key: "fee-invalid-rfd032",
    }),
    /fee arrangement rate card mismatch/,
  );
  assert.deepEqual(repository.snapshot(), before);
});

test("RFD-TUW-032 payment allocation rollback restores all tentative writes", () => {
  const repository = createFinanceRepository({
    seedRecords: [
      {
        model_type: "Payment",
        payment_id: "payment_rollback_rfd032",
        tenant_id: TENANT,
        matter_id: MATTER,
        client_group_id: CLIENT,
        bank_reference: "bank:rollback-rfd032",
        amount: 100,
        currency: "KRW",
        status: "imported",
        allocation_status: "unallocated",
        allocated_amount: 0,
        unallocated_amount: 100,
      },
      {
        model_type: "Invoice",
        invoice_id: "invoice_rollback_rfd032",
        tenant_id: TENANT,
        matter_id: MATTER,
        client_group_id: CLIENT,
        amount_due: 100,
        amount_paid: 0,
        outstanding_amount: 100,
        currency: "KRW",
        status: "issued",
      },
    ],
  });
  const before = repository.snapshot();
  const faultingRepository = Object.freeze({
    ...repository,
    transaction(execute) {
      return repository.transaction((tx) => execute({
        ...tx,
        recordIdempotency(entry) {
          if (entry.idempotency_key === "allocation-rollback-rfd032") {
            throw new Error("injected billing boundary receipt failure");
          }
          return tx.recordIdempotency(entry);
        },
      }));
    },
  });
  assert.throws(
    () => runFinanceBillingPaymentAllocationCreate({
      repository: faultingRepository,
      allocation: {
        payment_allocation_id: "allocation_rollback_rfd032",
        tenant_id: TENANT,
        payment_id: "payment_rollback_rfd032",
        invoice_id: "invoice_rollback_rfd032",
        allocation_type: "invoice_payment",
        matter_id: MATTER,
        client_group_id: CLIENT,
        amount: 100,
        currency: "KRW",
      },
      actor_id: ACTOR,
      idempotency_key: "allocation-rollback-rfd032",
    }),
    /injected billing boundary receipt failure/,
  );
  assert.deepEqual(repository.snapshot(), before);
});

test("RFD-TUW-032 API preserves route auth, envelopes, statuses, and payment replay", async () => {
  const repository = createFinanceRepository();
  const runtime = createFinanceRuntimeContext({ repository });
  const request = {
    pathname: "/api/finance/payments",
    method: "POST",
    body: {
      ...COMMON,
      idempotency_key: "api-payment-rfd032",
      payment: {
        payment_id: "payment_api_rfd032",
        tenant_id: TENANT,
        bank_reference: "bank:api-rfd032",
        amount: 100,
        currency: "KRW",
      },
    },
    context: ALLOW_CONTEXT,
    requestId: "request-api-payment-rfd032",
    runtime,
  };
  const first = await handleFinanceApiRequest(request);
  assert.equal(first.status, 201);
  assert.equal(first.body.outcome, "created");
  const afterFirst = repository.snapshot();
  const replay = await handleFinanceApiRequest({ ...request, requestId: "request-api-payment-rfd032-replay" });
  assert.equal(replay.status, 200);
  assert.equal(replay.body.outcome, "idempotent_replay");
  assert.deepEqual(repository.snapshot(), afterFirst);
  const beforeDenied = repository.snapshot();
  const denied = await handleFinanceApiRequest({
    ...request,
    requestId: "request-api-payment-rfd032-denied",
    context: DENY_CONTEXT,
    body: { ...request.body, idempotency_key: "api-payment-rfd032-denied", payment: { ...request.body.payment, payment_id: "payment_api_rfd032_denied" } },
  });
  assert.equal(denied.status, 403);
  assert.deepEqual(denied.body.items, []);
  assert.deepEqual(denied.body.safe_error_codes, [FINANCE_API_ERROR_CODES.unauthorized_omission]);
  assert.equal(denied.body.count_leak_prevented, true);
  assert.deepEqual(repository.snapshot().records, beforeDenied.records);
  assert.equal(repository.listAudit({ tenant_id: TENANT }).at(-1).decision, "deny");
});

test("RFD-TUW-032 rejects contradictory, cross-tenant, and malformed payment scopes before mutation", async () => {
  const cases = [
    {
      name: "request differs from Payment and Invoice",
      seedRecords: [
        { model_type: "Payment", payment_id: "payment_scope_mismatch", tenant_id: TENANT, matter_id: "matter_payment", amount: 100, currency: "KRW", status: "imported" },
        { model_type: "Invoice", invoice_id: "invoice_scope_mismatch", tenant_id: TENANT, matter_id: "matter_invoice", amount_due: 100, amount_paid: 0, currency: "KRW", status: "issued" },
      ],
      match: { payment_match_id: "match_scope_mismatch", payment_id: "payment_scope_mismatch", invoice_id: "invoice_scope_mismatch", matter_id: "matter_request" },
    },
    {
      name: "Payment belongs to another tenant",
      seedRecords: [
        { model_type: "Payment", payment_id: "payment_other_tenant", tenant_id: "tenant_other_rfd032", matter_id: MATTER, amount: 100, currency: "KRW", status: "imported" },
        { model_type: "Invoice", invoice_id: "invoice_current_tenant", tenant_id: TENANT, matter_id: MATTER, amount_due: 100, amount_paid: 0, currency: "KRW", status: "issued" },
      ],
      match: { payment_match_id: "match_cross_tenant", payment_id: "payment_other_tenant", invoice_id: "invoice_current_tenant", matter_id: MATTER },
    },
    {
      name: "request Matter has an invalid type",
      seedRecords: [
        { model_type: "Payment", payment_id: "payment_malformed_scope", tenant_id: TENANT, matter_id: MATTER, amount: 100, currency: "KRW", status: "imported" },
        { model_type: "Invoice", invoice_id: "invoice_malformed_scope", tenant_id: TENANT, matter_id: MATTER, amount_due: 100, amount_paid: 0, currency: "KRW", status: "issued" },
      ],
      match: { payment_match_id: "match_malformed_scope", payment_id: "payment_malformed_scope", invoice_id: "invoice_malformed_scope", matter_id: 42 },
    },
  ];

  for (const scenario of cases) {
    const repository = createFinanceRepository({ seedRecords: scenario.seedRecords });
    const runtime = createFinanceRuntimeContext({ repository });
    const before = repository.snapshot();
    const response = await handleFinanceApiRequest({
      pathname: "/api/finance/payment-matches",
      method: "POST",
      requestId: `request-${scenario.match.payment_match_id}`,
      runtime,
      context: financeWriteContext({ action: "finance:payment_match:write" }),
      body: {
        ...COMMON,
        idempotency_key: `idempotency-${scenario.match.payment_match_id}`,
        match: { tenant_id: TENANT, amount: 100, currency: "KRW", ...scenario.match },
      },
    });
    assert.equal(response.status, 400, scenario.name);
    assert.deepEqual(response.body.items, [], scenario.name);
    assertNoProductWrite(repository, before, { action: "payment.match", auditCount: 0 });
  }

  const allocationRepository = createFinanceRepository({
    seedRecords: [
      { model_type: "Payment", payment_id: "payment_allocation_cross_tenant", tenant_id: "tenant_other_rfd032", matter_id: MATTER, amount: 100, currency: "KRW", status: "imported" },
    ],
  });
  const allocationBefore = allocationRepository.snapshot();
  const allocationResponse = await handleFinanceApiRequest({
    pathname: "/api/finance/payment-allocations",
    method: "POST",
    requestId: "request-allocation-cross-tenant-rfd032",
    runtime: createFinanceRuntimeContext({ repository: allocationRepository }),
    context: financeWriteContext({ action: "finance:payment_allocation:write" }),
    body: {
      ...COMMON,
      idempotency_key: "idempotency-allocation-cross-tenant-rfd032",
      allocation: {
        payment_allocation_id: "allocation-cross-tenant-rfd032",
        tenant_id: TENANT,
        payment_id: "payment_allocation_cross_tenant",
        allocation_type: "direct_fee",
        matter_id: MATTER,
        client_group_id: CLIENT,
        amount: 100,
        currency: "KRW",
      },
    },
  });
  assert.equal(allocationResponse.status, 400);
  assertNoProductWrite(allocationRepository, allocationBefore, { action: "payment.allocate", auditCount: 0 });
});

test("RFD-TUW-032 preflights every canonical Matter for match/allocation denies and trims stored IDs", async () => {
  const repository = createFinanceRepository({
    seedRecords: [
      { model_type: "Payment", payment_id: "payment_walled_rfd032", tenant_id: TENANT, matter_id: " matter_walled ", amount: 100, currency: "KRW", status: "imported" },
      { model_type: "Invoice", invoice_id: "invoice_walled_rfd032", tenant_id: TENANT, matter_id: " matter_walled ", amount_due: 100, amount_paid: 0, currency: "KRW", status: "issued" },
    ],
  });
  const runtime = createFinanceRuntimeContext({ repository });
  const matchBefore = repository.snapshot();
  const matchDenied = await handleFinanceApiRequest({
    pathname: "/api/finance/payment-matches",
    method: "POST",
    requestId: "request-match-wall-rfd032",
    runtime,
    context: financeWriteContext({ action: "finance:payment_match:write", deniedMatter: "matter_walled" }),
    body: {
      ...COMMON,
      idempotency_key: "match-wall-rfd032",
      match: {
        payment_match_id: "match-wall-rfd032",
        tenant_id: TENANT,
        payment_id: "payment_walled_rfd032",
        invoice_id: "invoice_walled_rfd032",
        amount: 100,
        currency: "KRW",
      },
    },
  });
  assert.equal(matchDenied.status, 403);
  assert.deepEqual(matchDenied.body.items, []);
  assertNoProductWrite(repository, matchBefore, { action: "payment.match", auditCount: 1 });
  assert.equal(repository.listAudit({ tenant_id: TENANT }).at(-1).decision, "deny");
  assert.equal(financePaymentMatchMatterIds({
    repository,
    match: {
      tenant_id: TENANT,
      payment_id: "payment_walled_rfd032",
      invoice_id: "invoice_walled_rfd032",
      matter_id: " matter_walled ",
    },
    tenant_id: TENANT,
  })[0], "matter_walled");

  const allocationBefore = repository.snapshot();
  const allocationDenied = await handleFinanceApiRequest({
    pathname: "/api/finance/payment-allocations",
    method: "POST",
    requestId: "request-allocation-wall-rfd032",
    runtime,
    context: financeWriteContext({ action: "finance:payment_allocation:write", deniedMatter: "matter_walled" }),
    body: {
      ...COMMON,
      idempotency_key: "allocation-wall-rfd032",
      allocation: {
        payment_allocation_id: "allocation-wall-rfd032",
        tenant_id: TENANT,
        payment_id: "payment_walled_rfd032",
        invoice_id: "invoice_walled_rfd032",
        allocation_type: "invoice_payment",
        amount: 100,
        currency: "KRW",
      },
    },
  });
  assert.equal(allocationDenied.status, 403);
  assert.deepEqual(allocationDenied.body.items, []);
  assertNoProductWrite(repository, allocationBefore, { action: "payment.allocate", auditCount: 1 });
  assert.equal(repository.listAudit({ tenant_id: TENANT }).at(-1).decision, "deny");

  const existingMatterRepository = createFinanceRepository({
    seedRecords: [
      { model_type: "Payment", payment_id: "payment_existing_scope_rfd032", tenant_id: TENANT, matter_id: "matter_clear_rfd032", amount: 100, currency: "KRW", status: "imported" },
      { model_type: "Invoice", invoice_id: "invoice_existing_scope_rfd032", tenant_id: TENANT, matter_id: "matter_clear_rfd032", amount_due: 100, amount_paid: 0, currency: "KRW", status: "issued" },
      { model_type: "PaymentAllocation", payment_allocation_id: "allocation_existing_scope_rfd032", tenant_id: TENANT, payment_id: "payment_existing_scope_rfd032", invoice_id: "invoice_existing_scope_rfd032", matter_id: " matter_walled ", allocation_type: "invoice_payment", amount: 1, currency: "KRW", status: "posted" },
    ],
  });
  const existingMatterBefore = existingMatterRepository.snapshot();
  const existingMatterDenied = await handleFinanceApiRequest({
    pathname: "/api/finance/payment-matches",
    method: "POST",
    requestId: "request-existing-matter-wall-rfd032",
    runtime: createFinanceRuntimeContext({ repository: existingMatterRepository }),
    context: financeWriteContext({ action: "finance:payment_match:write", deniedMatter: "matter_walled" }),
    body: {
      ...COMMON,
      idempotency_key: "match-existing-matter-wall-rfd032",
      match: {
        payment_match_id: "match-existing-matter-wall-rfd032",
        tenant_id: TENANT,
        payment_id: "payment_existing_scope_rfd032",
        invoice_id: "invoice_existing_scope_rfd032",
        amount: 1,
        currency: "KRW",
      },
    },
  });
  assert.equal(existingMatterDenied.status, 403);
  assertNoProductWrite(existingMatterRepository, existingMatterBefore, { action: "payment.match", auditCount: 1 });
});

test("RFD-TUW-032 allows and replays a canonical payment match after Matter preflight", async () => {
  const repository = createFinanceRepository({
    seedRecords: [
      { model_type: "Payment", payment_id: "payment_match_allow_rfd032", tenant_id: TENANT, matter_id: "matter_allow_rfd032", amount: 100, currency: "KRW", status: "imported" },
      { model_type: "Invoice", invoice_id: "invoice_match_allow_rfd032", tenant_id: TENANT, matter_id: "matter_allow_rfd032", amount_due: 100, amount_paid: 0, currency: "KRW", status: "issued" },
    ],
  });
  const runtime = createFinanceRuntimeContext({ repository });
  const request = {
    pathname: "/api/finance/payment-matches",
    method: "POST",
    runtime,
    context: financeWriteContext({ action: "finance:payment_match:write" }),
    body: {
      ...COMMON,
      idempotency_key: "match-allow-rfd032",
      match: {
        payment_match_id: "match-allow-rfd032",
        tenant_id: TENANT,
        payment_id: "payment_match_allow_rfd032",
        invoice_id: "invoice_match_allow_rfd032",
        matter_id: "matter_allow_rfd032",
        amount: 100,
        currency: "KRW",
      },
    },
  };
  const first = await handleFinanceApiRequest({ ...request, requestId: "request-match-allow-rfd032" });
  assert.equal(first.status, 201);
  assert.equal(first.body.item.payment_match_id, "match-allow-rfd032");
  const afterFirst = repository.snapshot();
  const replay = await handleFinanceApiRequest({ ...request, requestId: "request-match-allow-rfd032-replay" });
  assert.equal(replay.status, 200);
  assert.equal(replay.body.outcome, "idempotent_replay");
  assert.deepEqual(repository.snapshot(), afterFirst);
});
