import assert from "node:assert/strict";
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import {
  applyWriteDownOff,
  approvePreBillWithoutAdjustment,
  createDraftInvoiceFromPreBill,
  createFinanceRepository,
  createInvoiceFromPreBill,
  createMatterPreBillFromWip,
  createPreBill,
  FinanceIdempotencyConflictError,
  generateWipFromApprovedItems,
  projectInvoiceLifecycle,
  queryMatterBillingWip,
  transitionInvoiceLifecycle,
} from "../src/index.js";
import {
  approveTimeEntryForWip,
  createFeeArrangement,
  createRateCard,
  createTimeEntry,
  lockTimeWeek,
  submitTimeWeek,
} from "../../time-expense/src/index.js";

const TENANT = "tenant-small-firm-billing";
const MATTER = "matter-small-firm-billing";
const ACTOR = "billing-operator";

function createBillingTerms(repository, {
  matterId = MATTER,
  roleRates = [{ role_id: "partner", hourly_rate: 100000 }],
  type = "hourly",
  terms = {},
} = {}) {
  const suffix = matterId.replaceAll(/[^a-z0-9]+/gi, "-");
  const rate = createRateCard({
    repository,
    rate_card: {
      rate_card_id: `rate-${suffix}`,
      tenant_id: TENANT,
      currency: "KRW",
      effective_from: "2026-07-01",
      role_rates: roleRates,
    },
    actor_id: ACTOR,
    idempotency_key: `rate-${suffix}`,
  }).rate_card;
  createFeeArrangement({
    repository,
    fee_arrangement: {
      fee_arrangement_id: `fee-${suffix}`,
      tenant_id: TENANT,
      matter_id: matterId,
      billing_profile_id: `billing-profile-${suffix}`,
      rate_card_id: rate.rate_card_id,
      type,
      ...terms,
    },
    rate_card: rate,
    actor_id: ACTOR,
    idempotency_key: `fee-${suffix}`,
  });
  return rate;
}

function approvedTime(repository, {
  id,
  matterId = MATTER,
  roleId = "partner",
  workDate = "2026-07-20",
  minutes = 60,
  billable = true,
  submittedAt = "2026-07-25T09:00:00.000Z",
} = {}) {
  const created = createTimeEntry({
    repository,
    time_entry: {
      time_entry_id: id,
      tenant_id: TENANT,
      matter_id: matterId,
      role_id: roleId,
      work_date: workDate,
      narrative: `work ${id}`,
      duration_minutes: minutes,
      billable,
    },
    actor_id: ACTOR,
    idempotency_key: `create-${id}`,
  });
  const approved = approveTimeEntryForWip({
    repository,
    tenant_id: TENANT,
    time_entry_id: id,
    actor_id: ACTOR,
    idempotency_key: `approve-${id}`,
  }).time_entry;
  const work = new Date(`${workDate}T00:00:00.000Z`);
  const day = work.getUTCDay();
  work.setUTCDate(work.getUTCDate() - (day === 0 ? 6 : day - 1));
  const weekStart = work.toISOString().slice(0, 10);
  submitTimeWeek({
    repository,
    tenant_id: TENANT,
    actor_id: ACTOR,
    time_entry_ids: [created.time_entry.time_entry_id],
    week_start: weekStart,
    idempotency_key: `submit-${id}`,
    now: submittedAt,
  });
  lockTimeWeek({
    repository,
    tenant_id: TENANT,
    actor_id: ACTOR,
    time_entry_ids: [created.time_entry.time_entry_id],
    week_start: weekStart,
    idempotency_key: `lock-${id}`,
    now: "2026-07-25T10:00:00.000Z",
  });
  return repository.get({
    tenant_id: TENANT,
    model_type: "TimeEntry",
    time_entry_id: approved.time_entry_id,
  });
}

function seedModernUnlockedApprovedTime(repository, {
  id,
  matterId,
  workDate = "2026-07-20",
} = {}) {
  return repository.create({
    model_type: "TimeEntry",
    time_entry_id: id,
    tenant_id: TENANT,
    matter_id: matterId,
    actor_id: ACTOR,
    role_id: "partner",
    work_date: workDate,
    narrative: `unlocked work ${id}`,
    duration_minutes: 60,
    billable: true,
    status: "approved",
    approved_for_wip: true,
    submitted_at: null,
    locked_at: null,
  });
}

function buildApprovedPreBill(repository, suffix) {
  const matterId = `${MATTER}-${suffix}`;
  const rateCard = createBillingTerms(repository, { matterId });
  const time = approvedTime(repository, { id: `time-${suffix}`, matterId });
  const wip = generateWipFromApprovedItems({
    repository,
    tenant_id: TENANT,
    matter_id: matterId,
    source_items: [time],
    rate_card: rateCard,
    actor_id: ACTOR,
    idempotency_key: `wip-${suffix}`,
  });
  const created = createMatterPreBillFromWip({
    repository,
    tenant_id: TENANT,
    matter_id: matterId,
    wip_item_ids: wip.wip_items.map((item) => item.wip_item_id),
    wip_snapshot_id: `snapshot-${suffix}`,
    prebill: {
      prebill_id: `prebill-${suffix}`,
      partner_reviewer_id: ACTOR,
      currency: "KRW",
    },
    actor_id: ACTOR,
    idempotency_key: `matter-prebill-${suffix}`,
  });
  const approved = approvePreBillWithoutAdjustment({
    repository,
    tenant_id: TENANT,
    prebill_id: created.prebill.prebill_id,
    actor_id: ACTOR,
    idempotency_key: `approve-prebill-${suffix}`,
  });
  return { matterId, time, wip, snapshot: created.wip_snapshot, prebill: approved.prebill };
}

function completeMatterBillingCycle(repository, {
  matterId,
  wip,
  suffix,
  issuedAt,
} = {}) {
  const created = createMatterPreBillFromWip({
    repository,
    tenant_id: TENANT,
    matter_id: matterId,
    wip_item_ids: wip.wip_items.map((item) => item.wip_item_id),
    wip_snapshot_id: `snapshot-${suffix}`,
    prebill: {
      prebill_id: `prebill-${suffix}`,
      partner_reviewer_id: ACTOR,
      currency: "KRW",
    },
    actor_id: ACTOR,
    idempotency_key: `prebill-${suffix}`,
  });
  const approved = approvePreBillWithoutAdjustment({
    repository,
    tenant_id: TENANT,
    prebill_id: created.prebill.prebill_id,
    actor_id: ACTOR,
    idempotency_key: `approve-${suffix}`,
  });
  const invoiced = createInvoiceFromPreBill({
    repository,
    invoice: {
      invoice_id: `invoice-${suffix}`,
      tenant_id: TENANT,
      matter_id: matterId,
      prebill_id: approved.prebill.prebill_id,
      billing_client_party_id: "client-repeat-cycle",
      currency: "KRW",
      issued_at: issuedAt,
    },
    actor_id: ACTOR,
    idempotency_key: `invoice-${suffix}`,
  });
  return Object.freeze({
    wip,
    snapshot: created.wip_snapshot,
    prebill: approved.prebill,
    invoice: invoiced.invoice,
  });
}

test("[TUW-33] billing-owned WIP query excludes ineligible and invoiced time and surfaces configuration errors", () => {
  const repository = createFinanceRepository();
  const rateCard = createBillingTerms(repository);
  const ready = approvedTime(repository, { id: "time-ready", workDate: "2026-07-20" });
  const billed = approvedTime(repository, { id: "time-billed", workDate: "2026-07-01", minutes: 30 });
  approvedTime(repository, { id: "time-nonbillable", billable: false });
  createTimeEntry({
    repository,
    time_entry: {
      time_entry_id: "time-unapproved",
      tenant_id: TENANT,
      matter_id: MATTER,
      role_id: "partner",
      work_date: "2026-07-20",
      narrative: "draft time",
      duration_minutes: 60,
      billable: true,
    },
    actor_id: ACTOR,
    idempotency_key: "time-unapproved",
  });
  repository.create({
    model_type: "TimeEntry",
    time_entry_id: "time-legacy-approved",
    tenant_id: TENANT,
    matter_id: MATTER,
    role_id: "partner",
    work_date: "2026-07-21",
    narrative: "legacy approved time",
    duration_minutes: 30,
    billable: true,
    status: "approved",
  });

  const generated = generateWipFromApprovedItems({
    repository,
    tenant_id: TENANT,
    matter_id: MATTER,
    source_items: [billed],
    rate_card: rateCard,
    actor_id: ACTOR,
    idempotency_key: "wip-billed",
  });
  const billing = createMatterPreBillFromWip({
    repository,
    tenant_id: TENANT,
    matter_id: MATTER,
    wip_item_ids: [generated.wip_items[0].wip_item_id],
    prebill: {
      prebill_id: "prebill-billed",
      partner_reviewer_id: ACTOR,
      currency: "KRW",
    },
    actor_id: ACTOR,
    idempotency_key: "prebill-billed",
  });
  approvePreBillWithoutAdjustment({
    repository,
    tenant_id: TENANT,
    prebill_id: billing.prebill.prebill_id,
    actor_id: ACTOR,
    idempotency_key: "prebill-billed-approve",
  });
  createInvoiceFromPreBill({
    repository,
    invoice: {
      invoice_id: "invoice-billed",
      tenant_id: TENANT,
      matter_id: MATTER,
      prebill_id: billing.prebill.prebill_id,
      billing_client_party_id: "client-billed",
      currency: "KRW",
      issued_at: "2026-07-25T00:00:00.000Z",
    },
    actor_id: ACTOR,
    idempotency_key: "invoice-billed",
  });

  const missingRateMatter = "matter-missing-role-rate";
  createBillingTerms(repository, { matterId: missingRateMatter });
  approvedTime(repository, { id: "time-missing-role-rate", matterId: missingRateMatter, roleId: "associate" });
  const missingFeeMatter = "matter-missing-fee";
  approvedTime(repository, { id: "time-missing-fee", matterId: missingFeeMatter });
  const unlockedMatter = "matter-unlocked-week";
  createBillingTerms(repository, { matterId: unlockedMatter });
  seedModernUnlockedApprovedTime(repository, {
    id: "time-unlocked-week",
    matterId: unlockedMatter,
  });

  const result = queryMatterBillingWip({
    repository,
    tenant_id: TENANT,
    as_of_date: "2026-07-31",
  });
  const matter = result.matters.find((item) => item.matter_id === MATTER);
  assert.deepEqual(
    result.rows.filter((row) => row.matter_id === MATTER).map((row) => row.source_id),
    [ready.time_entry_id, "time-legacy-approved"],
  );
  assert.equal(matter.total_amount, 150000);
  assert.equal(matter.age_days_total, 21);
  assert.equal(matter.oldest_age_days, 11);
  assert.equal(result.rows.some((row) => row.source_id === billed.time_entry_id), false);
  assert.equal(result.rows.some((row) => row.source_id === "time-nonbillable"), false);
  assert.equal(result.rows.some((row) => row.source_id === "time-unapproved"), false);
  assert.equal(result.rows.find((row) => row.source_id === "time-missing-role-rate").error_code, "missing_role_rate");
  assert.equal(result.rows.find((row) => row.source_id === "time-missing-fee").error_code, "missing_fee_arrangement");
  assert.equal(result.rows.find((row) => row.source_id === "time-unlocked-week").error_code, "weekly_time_not_locked");
  assert.equal(result.rows.find((row) => row.source_id === "time-missing-role-rate").amount, null);
});

test("[TUW-34] selected WIP becomes one immutable snapshot and write-down changes only the PreBill", () => {
  const repository = createFinanceRepository();
  const matterId = `${MATTER}-snapshot`;
  const rateCard = createBillingTerms(repository, { matterId });
  const time = approvedTime(repository, { id: "time-snapshot", matterId });
  const wip = generateWipFromApprovedItems({
    repository,
    tenant_id: TENANT,
    matter_id: matterId,
    source_items: [time],
    rate_card: rateCard,
    actor_id: ACTOR,
    idempotency_key: "wip-snapshot",
  });
  const request = {
    repository,
    tenant_id: TENANT,
    matter_id: matterId,
    wip_item_ids: [wip.wip_items[0].wip_item_id],
    wip_snapshot_id: "snapshot-immutable",
    prebill: {
      prebill_id: "prebill-immutable",
      partner_reviewer_id: ACTOR,
      currency: "KRW",
    },
    actor_id: ACTOR,
    idempotency_key: "matter-prebill-immutable",
  };
  const created = createMatterPreBillFromWip(request);
  const replay = createMatterPreBillFromWip(request);
  assert.equal(created.wip_snapshot.immutable_snapshot, true);
  assert.deepEqual(created.wip_snapshot.item_snapshots, [{
    wip_item_id: wip.wip_items[0].wip_item_id,
    source_model_type: "TimeEntry",
    source_id: time.time_entry_id,
    amount: 100000,
    standard_amount: 100000,
    currency: "KRW",
  }]);
  assert.equal(replay.idempotent_replay, true);
  assert.equal(repository.list({ tenant_id: TENANT, model_type: "WipSnapshot" }).length, 1);
  assert.equal(repository.list({ tenant_id: TENANT, model_type: "PreBill" }).length, 1);
  assert.throws(
    () => repository.update(
      { tenant_id: TENANT, model_type: "WipSnapshot", wip_snapshot_id: "snapshot-immutable" },
      { total_amount: 1 },
    ),
    /immutable WIP snapshot/,
  );
  assert.throws(
    () => repository.upsert({ ...created.wip_snapshot, total_amount: 1 }),
    /immutable WIP snapshot/,
  );
  assert.throws(
    () => createPreBill({
      repository,
      prebill: {
        prebill_id: "prebill-duplicate-snapshot",
        tenant_id: TENANT,
        matter_id: matterId,
        wip_snapshot_id: "snapshot-immutable",
        partner_reviewer_id: ACTOR,
      },
      actor_id: ACTOR,
      idempotency_key: "prebill-duplicate-snapshot",
    }),
    /already has a PreBill/,
  );

  const adjusted = applyWriteDownOff({
    repository,
    adjustment: {
      adjustment_id: "adjustment-immutable",
      tenant_id: TENANT,
      prebill_id: created.prebill.prebill_id,
      reason_code: "partner_write_down",
      amount: 10000,
    },
    actor_id: ACTOR,
    idempotency_key: "adjustment-immutable",
  });
  assert.equal(adjusted.prebill.total_amount, 90000);
  assert.equal(repository.get({
    tenant_id: TENANT,
    model_type: "WipSnapshot",
    wip_snapshot_id: "snapshot-immutable",
  }).total_amount, 100000);
  assert.equal(repository.get({
    tenant_id: TENANT,
    model_type: "WipItem",
    wip_item_id: wip.wip_items[0].wip_item_id,
  }).amount, 100000);
  assert.equal(repository.get({
    tenant_id: TENANT,
    model_type: "TimeEntry",
    time_entry_id: time.time_entry_id,
  }).duration_minutes, 60);
});

test("[TUW-35] approved PreBill creates one draft and lifecycle projects sent partial paid overdue and void", () => {
  const repository = createFinanceRepository();
  const { matterId, prebill } = buildApprovedPreBill(repository, "lifecycle");
  const request = {
    repository,
    invoice: {
      invoice_id: "invoice-lifecycle",
      tenant_id: TENANT,
      matter_id: matterId,
      prebill_id: prebill.prebill_id,
      billing_client_party_id: "client-lifecycle",
      currency: "KRW",
      drafted_at: "2026-07-01T00:00:00.000Z",
      payment_terms_days: 30,
    },
    actor_id: ACTOR,
    idempotency_key: "invoice-lifecycle-draft",
  };
  const draft = createDraftInvoiceFromPreBill(request);
  const replay = createDraftInvoiceFromPreBill(request);
  assert.equal(draft.invoice.status, "draft");
  assert.equal(draft.invoice.lifecycle_status, "draft");
  assert.equal(draft.invoice.due_date, null);
  assert.equal(replay.idempotent_replay, true);
  assert.equal(repository.list({ tenant_id: TENANT, model_type: "Invoice" }).length, 1);
  assert.throws(
    () => createDraftInvoiceFromPreBill({
      ...request,
      invoice: { ...request.invoice, invoice_id: "invoice-lifecycle-duplicate" },
      idempotency_key: "invoice-lifecycle-duplicate",
    }),
    /PreBill already has an Invoice/,
  );

  const sent = transitionInvoiceLifecycle({
    repository,
    tenant_id: TENANT,
    invoice_id: draft.invoice.invoice_id,
    to_status: "sent",
    transition_at: "2026-07-01T09:00:00.000Z",
    actor_id: ACTOR,
    idempotency_key: "invoice-lifecycle-sent",
  });
  assert.equal(sent.invoice.status, "sent");
  assert.equal(sent.invoice.due_date, "2026-07-31");
  assert.equal(projectInvoiceLifecycle({ invoice: sent.invoice, as_of_date: "2026-07-31" }).lifecycle_status, "sent");
  assert.equal(projectInvoiceLifecycle({
    invoice: { ...sent.invoice, amount_paid: 40000 },
    as_of_date: "2026-07-31",
  }).lifecycle_status, "partial");
  assert.equal(projectInvoiceLifecycle({
    invoice: { ...sent.invoice, amount_paid: sent.invoice.amount_due },
    as_of_date: "2026-07-31",
  }).lifecycle_status, "paid");
  assert.equal(projectInvoiceLifecycle({ invoice: sent.invoice, as_of_date: "2026-08-01" }).lifecycle_status, "overdue");

  const overdue = transitionInvoiceLifecycle({
    repository,
    tenant_id: TENANT,
    invoice_id: draft.invoice.invoice_id,
    to_status: "overdue",
    as_of_date: "2026-08-01",
    transition_at: "2026-08-01T09:00:00.000Z",
    actor_id: ACTOR,
    idempotency_key: "invoice-lifecycle-overdue",
  });
  const voided = transitionInvoiceLifecycle({
    repository,
    tenant_id: TENANT,
    invoice_id: draft.invoice.invoice_id,
    to_status: "void",
    reason_code: "client_engagement_cancelled",
    transition_at: "2026-08-01T10:00:00.000Z",
    actor_id: ACTOR,
    idempotency_key: "invoice-lifecycle-void",
  });
  assert.equal(overdue.invoice.lifecycle_status, "overdue");
  assert.equal(voided.invoice.lifecycle_status, "void");
  assert.equal(voided.invoice.void_reason_code, "client_engagement_cancelled");
  assert.throws(
    () => transitionInvoiceLifecycle({
      repository,
      tenant_id: TENANT,
      invoice_id: draft.invoice.invoice_id,
      to_status: "sent",
      actor_id: ACTOR,
      idempotency_key: "invoice-lifecycle-invalid",
    }),
    /invalid invoice lifecycle transition/,
  );
});

test("[RF-08] a second billing cycle selects only new Matter sources and preserves the first lineage", () => {
  const repository = createFinanceRepository();
  const matterId = `${MATTER}-repeat-cycle`;
  const rateCard = createBillingTerms(repository, { matterId });

  const firstTime = approvedTime(repository, {
    id: "time-repeat-cycle-one",
    matterId,
    workDate: "2026-07-20",
  });
  const firstWipRequest = {
    repository,
    tenant_id: TENANT,
    matter_id: matterId,
    rate_card: rateCard,
    actor_id: ACTOR,
    idempotency_key: "wip-repeat-cycle-one",
  };
  const firstCycle = completeMatterBillingCycle(repository, {
    matterId,
    wip: generateWipFromApprovedItems(firstWipRequest),
    suffix: "repeat-one",
    issuedAt: "2026-07-25T00:00:00.000Z",
  });
  const firstLineage = {
    wip_item: repository.get({
      tenant_id: TENANT,
      model_type: "WipItem",
      wip_item_id: firstCycle.wip.wip_items[0].wip_item_id,
    }),
    snapshot: repository.get({
      tenant_id: TENANT,
      model_type: "WipSnapshot",
      wip_snapshot_id: firstCycle.snapshot.wip_snapshot_id,
    }),
    prebill: repository.get({
      tenant_id: TENANT,
      model_type: "PreBill",
      prebill_id: firstCycle.prebill.prebill_id,
    }),
    invoice: repository.get({
      tenant_id: TENANT,
      model_type: "Invoice",
      invoice_id: firstCycle.invoice.invoice_id,
    }),
  };

  const secondTime = approvedTime(repository, {
    id: "time-repeat-cycle-two",
    matterId,
    workDate: "2026-07-28",
    submittedAt: "2026-07-30T09:00:00.000Z",
  });
  const candidates = queryMatterBillingWip({
    repository,
    tenant_id: TENANT,
    matter_id: matterId,
    as_of_date: "2026-07-31",
  });
  assert.deepEqual(
    candidates.rows.map((row) => ({
      source_id: row.source_id,
      wip_item_id: row.wip_item_id,
      status: row.status,
    })),
    [{ source_id: secondTime.time_entry_id, wip_item_id: null, status: "ready" }],
  );

  const secondWip = generateWipFromApprovedItems({
    repository,
    tenant_id: TENANT,
    matter_id: matterId,
    rate_card: rateCard,
    actor_id: ACTOR,
    idempotency_key: "wip-repeat-cycle-two",
  });
  assert.deepEqual(secondWip.wip_items.map((item) => item.source_id), [secondTime.time_entry_id]);
  assert.equal(generateWipFromApprovedItems(firstWipRequest).idempotent_replay, true);
  assert.notEqual(secondWip.source_set_id, firstCycle.wip.source_set_id);
  assert.deepEqual(candidates.eligible_source_sets, [{
    matter_id: matterId,
    source_set_id: secondWip.source_set_id,
    source_count: 1,
    source_refs: [{ model_type: "TimeEntry", source_id: secondTime.time_entry_id }],
  }]);

  const secondCycle = completeMatterBillingCycle(repository, {
    matterId,
    wip: secondWip,
    suffix: "repeat-two",
    issuedAt: "2026-07-31T00:00:00.000Z",
  });
  assert.equal(firstCycle.snapshot.source_set_id, firstCycle.wip.source_set_id);
  assert.equal(secondCycle.snapshot.source_set_id, secondWip.source_set_id);
  assert.notEqual(secondCycle.snapshot.source_set_id, firstCycle.snapshot.source_set_id);
  assert.deepEqual(firstCycle.snapshot.source_refs, [{
    model_type: "TimeEntry",
    source_id: firstTime.time_entry_id,
  }]);
  assert.deepEqual(secondCycle.snapshot.source_refs, [{
    model_type: "TimeEntry",
    source_id: secondTime.time_entry_id,
  }]);
  assert.equal(secondCycle.prebill.wip_snapshot_id, secondCycle.snapshot.wip_snapshot_id);
  assert.equal(secondCycle.invoice.prebill_id, secondCycle.prebill.prebill_id);
  assert.deepEqual(repository.get({
    tenant_id: TENANT,
    model_type: "WipItem",
    wip_item_id: firstLineage.wip_item.wip_item_id,
  }), firstLineage.wip_item);
  assert.deepEqual(repository.get({
    tenant_id: TENANT,
    model_type: "WipSnapshot",
    wip_snapshot_id: firstLineage.snapshot.wip_snapshot_id,
  }), firstLineage.snapshot);
  assert.deepEqual(repository.get({
    tenant_id: TENANT,
    model_type: "PreBill",
    prebill_id: firstLineage.prebill.prebill_id,
  }), firstLineage.prebill);
  assert.deepEqual(repository.get({
    tenant_id: TENANT,
    model_type: "Invoice",
    invoice_id: firstLineage.invoice.invoice_id,
  }), firstLineage.invoice);
});

test("[RF-08] repeated billing-cycle lineages survive durable repository reopen", () => {
  const storePath = join(mkdtempSync(join(tmpdir(), "billing-rf08-")), "finance.json");
  const matterId = `${MATTER}-repeat-cycle-durable`;
  let repository = createFinanceRepository({ filePath: storePath });
  let rateCard = createBillingTerms(repository, { matterId });
  const readLineage = (currentRepository, cycle) => ({
    wip_items: cycle.wip.wip_items.map((item) => currentRepository.get({
      tenant_id: TENANT,
      model_type: "WipItem",
      wip_item_id: item.wip_item_id,
    })),
    snapshot: currentRepository.get({
      tenant_id: TENANT,
      model_type: "WipSnapshot",
      wip_snapshot_id: cycle.snapshot.wip_snapshot_id,
    }),
    prebill: currentRepository.get({
      tenant_id: TENANT,
      model_type: "PreBill",
      prebill_id: cycle.prebill.prebill_id,
    }),
    invoice: currentRepository.get({
      tenant_id: TENANT,
      model_type: "Invoice",
      invoice_id: cycle.invoice.invoice_id,
    }),
    invoice_lines: currentRepository.list({
      tenant_id: TENANT,
      model_type: "InvoiceLine",
      invoice_id: cycle.invoice.invoice_id,
    }),
  });
  const generateCycleWip = (suffix) => generateWipFromApprovedItems({
    repository,
    tenant_id: TENANT,
    matter_id: matterId,
    rate_card: rateCard,
    actor_id: ACTOR,
    idempotency_key: `wip-durable-${suffix}`,
  });

  const firstTime = approvedTime(repository, {
    id: "time-durable-cycle-one",
    matterId,
    workDate: "2026-07-14",
  });
  const firstCycle = completeMatterBillingCycle(repository, {
    matterId,
    wip: generateCycleWip("one"),
    suffix: "durable-one",
    issuedAt: "2026-07-25T00:00:00.000Z",
  });
  const firstLineage = readLineage(repository, firstCycle);
  repository.close();

  repository = createFinanceRepository({ filePath: storePath });
  rateCard = repository.get({
    tenant_id: TENANT,
    model_type: "RateCard",
    rate_card_id: rateCard.rate_card_id,
  });
  assert.deepEqual(readLineage(repository, firstCycle), firstLineage);
  const firstReplay = generateCycleWip("one");
  assert.equal(firstReplay.idempotent_replay, true);
  assert.equal(firstReplay.source_set_id, firstCycle.wip.source_set_id);

  const secondTime = approvedTime(repository, {
    id: "time-durable-cycle-two",
    matterId,
    workDate: "2026-07-21",
  });
  const candidates = queryMatterBillingWip({
    repository,
    tenant_id: TENANT,
    matter_id: matterId,
    as_of_date: "2026-07-31",
  });
  assert.deepEqual(candidates.eligible_source_sets[0].source_refs, [{
    model_type: "TimeEntry",
    source_id: secondTime.time_entry_id,
  }]);
  const secondCycle = completeMatterBillingCycle(repository, {
    matterId,
    wip: generateCycleWip("two"),
    suffix: "durable-two",
    issuedAt: "2026-07-31T00:00:00.000Z",
  });
  const secondLineage = readLineage(repository, secondCycle);
  assert.deepEqual(readLineage(repository, firstCycle), firstLineage);
  assert.notEqual(firstCycle.wip.source_set_id, secondCycle.wip.source_set_id);
  assert.equal(firstCycle.snapshot.source_set_id, firstCycle.wip.source_set_id);
  assert.equal(secondCycle.snapshot.source_set_id, secondCycle.wip.source_set_id);
  repository.close();

  repository = createFinanceRepository({ filePath: storePath });
  rateCard = repository.get({
    tenant_id: TENANT,
    model_type: "RateCard",
    rate_card_id: rateCard.rate_card_id,
  });
  assert.deepEqual(readLineage(repository, firstCycle), firstLineage);
  assert.deepEqual(readLineage(repository, secondCycle), secondLineage);
  assert.deepEqual(
    repository
      .list({ tenant_id: TENANT, matter_id: matterId, model_type: "WipSnapshot" })
      .map((snapshot) => snapshot.source_set_id)
      .sort(),
    [firstCycle.wip.source_set_id, secondCycle.wip.source_set_id].sort(),
  );
  assert.equal(repository.list({
    tenant_id: TENANT,
    matter_id: matterId,
    model_type: "WipItem",
  }).length, 2);
  assert.equal(repository.list({
    tenant_id: TENANT,
    matter_id: matterId,
    model_type: "PreBill",
  }).length, 2);
  assert.equal(repository.list({
    tenant_id: TENANT,
    matter_id: matterId,
    model_type: "Invoice",
  }).length, 2);
  assert.equal(generateCycleWip("one").idempotent_replay, true);
  assert.equal(generateCycleWip("two").idempotent_replay, true);
  assert.deepEqual(queryMatterBillingWip({
    repository,
    tenant_id: TENANT,
    matter_id: matterId,
    as_of_date: "2026-07-31",
  }).eligible_source_sets, []);
  assert.deepEqual(
    repository
      .listAudit({ tenant_id: TENANT })
      .filter((event) => event.action === "wip.generate" && event.object_id === matterId)
      .map((event) => event.metadata.source_set_id)
      .sort(),
    [firstCycle.wip.source_set_id, secondCycle.wip.source_set_id].sort(),
  );
  assert.deepEqual(firstCycle.snapshot.source_refs, [{
    model_type: "TimeEntry",
    source_id: firstTime.time_entry_id,
  }]);
  repository.close();
});

test("[RF-08] duplicate and cross-scope WIP source sets fail atomically", () => {
  const repository = createFinanceRepository();
  const matterId = `${MATTER}-repeat-cycle-atomic`;
  const rateCard = createBillingTerms(repository, { matterId });
  const existing = approvedTime(repository, {
    id: "time-repeat-existing",
    matterId,
    workDate: "2026-07-20",
  });
  generateWipFromApprovedItems({
    repository,
    tenant_id: TENANT,
    matter_id: matterId,
    source_items: [existing],
    rate_card: rateCard,
    actor_id: ACTOR,
    idempotency_key: "wip-repeat-existing",
  });
  const fresh = approvedTime(repository, {
    id: "time-repeat-fresh",
    matterId,
    workDate: "2026-07-28",
  });
  const otherMatter = repository.create({
    model_type: "TimeEntry",
    time_entry_id: "time-repeat-other-matter",
    tenant_id: TENANT,
    matter_id: `${matterId}-other`,
    role_id: "partner",
    work_date: "2026-07-28",
    duration_minutes: 60,
    billable: true,
    status: "locked",
    locked_at: "2026-07-30T10:00:00.000Z",
  });
  const otherTenant = repository.create({
    model_type: "TimeEntry",
    time_entry_id: "time-repeat-other-tenant",
    tenant_id: `${TENANT}-other`,
    matter_id: matterId,
    role_id: "partner",
    work_date: "2026-07-28",
    duration_minutes: 60,
    billable: true,
    status: "locked",
    locked_at: "2026-07-30T10:00:00.000Z",
  });
  const assertAtomicRejection = (sourceItems, idempotencyKey, matcher) => {
    const before = repository.snapshot();
    assert.throws(
      () => generateWipFromApprovedItems({
        repository,
        tenant_id: TENANT,
        matter_id: matterId,
        source_items: sourceItems,
        rate_card: rateCard,
        actor_id: ACTOR,
        idempotency_key: idempotencyKey,
      }),
      matcher,
    );
    assert.deepEqual(repository.snapshot(), before);
  };

  assertAtomicRejection(
    [fresh, fresh],
    "wip-repeat-duplicate-request",
    /approved billable source item is duplicated/,
  );
  assertAtomicRejection(
    [existing, fresh],
    "wip-repeat-existing-conflict",
    (error) => error.code === "FINANCE_WIP_SOURCE_CONFLICT" && error.status === 409,
  );
  assertAtomicRejection(
    [fresh, otherMatter],
    "wip-repeat-cross-matter",
    /source item Matter must match WIP Matter/,
  );
  assertAtomicRejection(
    [fresh, otherTenant],
    "wip-repeat-cross-tenant",
    /source item tenant must match WIP tenant/,
  );
  assert.equal(repository.get({
    tenant_id: TENANT,
    model_type: "WipItem",
    wip_item_id: `wip:${TENANT}:${matterId}:TimeEntry:${fresh.time_entry_id}`,
  }), undefined);
});

test("[H2] WIP source identity is canonical across source order and subset retries", () => {
  const matterId = `${MATTER}-canonical-wip`;
  const source = (id) => ({
    model_type: "TimeEntry",
    time_entry_id: id,
    resource_id: id,
    tenant_id: TENANT,
    matter_id: matterId,
    role_id: "partner",
    work_date: "2026-07-28",
    duration_minutes: 60,
    billable: true,
    status: "approved",
  });
  const firstRepository = createFinanceRepository();
  const firstRateCard = createBillingTerms(firstRepository, { matterId });
  const firstSources = [
    firstRepository.create(source("source-a")),
    firstRepository.create(source("source-b")),
  ];
  const reversed = generateWipFromApprovedItems({
    repository: firstRepository,
    tenant_id: TENANT,
    matter_id: matterId,
    source_items: [firstSources[1], firstSources[0]],
    rate_card: firstRateCard,
    actor_id: ACTOR,
    idempotency_key: "canonical-wip-reversed",
  });
  const secondRepository = createFinanceRepository();
  const secondRateCard = createBillingTerms(secondRepository, { matterId });
  const secondSources = [
    secondRepository.create(source("source-a")),
    secondRepository.create(source("source-b")),
  ];
  const ordered = generateWipFromApprovedItems({
    repository: secondRepository,
    tenant_id: TENANT,
    matter_id: matterId,
    source_items: secondSources,
    rate_card: secondRateCard,
    actor_id: ACTOR,
    idempotency_key: "canonical-wip-ordered",
  });
  assert.deepEqual(
    reversed.wip_items.map((item) => item.wip_item_id),
    ordered.wip_items.map((item) => item.wip_item_id),
  );
  assert.equal(reversed.source_set_id, ordered.source_set_id);
  assert.deepEqual(reversed.source_refs, [
    { model_type: "TimeEntry", source_id: "source-a" },
    { model_type: "TimeEntry", source_id: "source-b" },
  ]);
  assert.deepEqual(
    reversed.wip_items.map((item) => item.wip_item_id),
    [
      `wip:${TENANT}:${matterId}:TimeEntry:source-a`,
      `wip:${TENANT}:${matterId}:TimeEntry:source-b`,
    ],
  );
  assert.throws(
    () => generateWipFromApprovedItems({
      repository: firstRepository,
      tenant_id: TENANT,
      matter_id: matterId,
      source_items: [firstSources[1]],
      rate_card: firstRateCard,
      actor_id: ACTOR,
      idempotency_key: "canonical-wip-subset",
    }),
    (error) => error.code === "FINANCE_WIP_SOURCE_CONFLICT" && error.status === 409,
  );
  assert.throws(
    () => firstRepository.create({
      model_type: "WipItem",
      wip_item_id: "alternate-id-for-source-a",
      tenant_id: TENANT,
      matter_id: matterId,
      source_model_type: "TimeEntry",
      source_id: "source-a",
      amount: 100000,
    }),
    (error) => error.code === "FINANCE_WIP_SOURCE_CONFLICT" && error.status === 409,
  );
  assert.equal(firstRepository.list({ tenant_id: TENANT, model_type: "WipItem" }).length, 2);
  firstRepository.create({
    model_type: "WipItem",
    wip_item_id: "same-source-different-matter",
    tenant_id: TENANT,
    matter_id: `${MATTER}-other`,
    source_model_type: "TimeEntry",
    source_id: "source-a",
    amount: 100000,
  });
  assert.equal(firstRepository.list({
    tenant_id: TENANT,
    matter_id: `${MATTER}-other`,
    model_type: "WipItem",
  }).length, 1);
});

test("[H2] fixed, success, and retainer consumption remains durable across separate WIP batches", (t) => {
  const fixedRepository = createFinanceRepository();
  const fixedMatter = `${MATTER}-fixed-split`;
  const fixedRate = createBillingTerms(fixedRepository, {
    matterId: fixedMatter,
    type: "fixed",
    terms: { fixed_fee_amount: 250000 },
  });
  const fixedFirst = approvedTime(fixedRepository, { id: "fixed-split-first", matterId: fixedMatter });
  const fixedSecond = approvedTime(fixedRepository, { id: "fixed-split-second", matterId: fixedMatter });
  const fixedBatchOne = generateWipFromApprovedItems({
    repository: fixedRepository,
    tenant_id: TENANT,
    matter_id: fixedMatter,
    source_items: [fixedFirst],
    rate_card: fixedRate,
    actor_id: ACTOR,
    idempotency_key: "fixed-split-batch-one",
  });
  const fixedBatchTwo = generateWipFromApprovedItems({
    repository: fixedRepository,
    tenant_id: TENANT,
    matter_id: fixedMatter,
    source_items: [fixedSecond],
    rate_card: fixedRate,
    actor_id: ACTOR,
    idempotency_key: "fixed-split-batch-two",
  });
  assert.deepEqual(
    [fixedBatchOne.wip_items[0].amount, fixedBatchTwo.wip_items[0].amount],
    [250000, 0],
  );
  assert.deepEqual(
    [fixedBatchOne.wip_items[0].fixed_fee_applied, fixedBatchTwo.wip_items[0].fixed_fee_applied],
    [true, false],
  );

  const successRepository = createFinanceRepository();
  const successMatter = `${MATTER}-success-split`;
  const successRate = createBillingTerms(successRepository, {
    matterId: successMatter,
    type: "success_fee",
    terms: {
      upfront_fee_amount: 100000,
      success_fee_amount: 500000,
      success_condition_met: false,
    },
  });
  const successSources = ["first", "second", "third"].map((suffix) =>
    approvedTime(successRepository, { id: `success-split-${suffix}`, matterId: successMatter }));
  const successBatchOne = generateWipFromApprovedItems({
    repository: successRepository,
    tenant_id: TENANT,
    matter_id: successMatter,
    source_items: [successSources[0]],
    rate_card: successRate,
    actor_id: ACTOR,
    idempotency_key: "success-split-batch-one",
  });
  const successArrangement = successRepository
    .list({ tenant_id: TENANT, matter_id: successMatter, model_type: "FeeArrangement" })
    .at(-1);
  successRepository.update(
    {
      tenant_id: TENANT,
      model_type: "FeeArrangement",
      fee_arrangement_id: successArrangement.fee_arrangement_id,
    },
    { success_condition_met: true, updates_database_rows: true },
  );
  const successBatchTwo = generateWipFromApprovedItems({
    repository: successRepository,
    tenant_id: TENANT,
    matter_id: successMatter,
    source_items: [successSources[1]],
    rate_card: successRate,
    actor_id: ACTOR,
    idempotency_key: "success-split-batch-two",
  });
  const successBatchThree = generateWipFromApprovedItems({
    repository: successRepository,
    tenant_id: TENANT,
    matter_id: successMatter,
    source_items: [successSources[2]],
    rate_card: successRate,
    actor_id: ACTOR,
    idempotency_key: "success-split-batch-three",
  });
  assert.deepEqual(
    [
      successBatchOne.wip_items[0].amount,
      successBatchTwo.wip_items[0].amount,
      successBatchThree.wip_items[0].amount,
    ],
    [100000, 500000, 0],
  );
  assert.deepEqual(
    [
      successBatchOne.wip_items[0].upfront_fee_applied,
      successBatchTwo.wip_items[0].upfront_fee_applied,
      successBatchThree.wip_items[0].upfront_fee_applied,
    ],
    [true, false, false],
  );
  assert.deepEqual(
    [
      successBatchOne.wip_items[0].success_fee_applied,
      successBatchTwo.wip_items[0].success_fee_applied,
      successBatchThree.wip_items[0].success_fee_applied,
    ],
    [false, true, false],
  );

  const retainerRepository = createFinanceRepository();
  const retainerMatter = `${MATTER}-retainer-split`;
  const retainerRate = createBillingTerms(retainerRepository, {
    matterId: retainerMatter,
    type: "retainer",
    terms: { retainer_amount: 150000 },
  });
  const retainerFirst = approvedTime(retainerRepository, { id: "retainer-split-first", matterId: retainerMatter });
  const retainerSecond = approvedTime(retainerRepository, { id: "retainer-split-second", matterId: retainerMatter });
  const retainerBatchOne = generateWipFromApprovedItems({
    repository: retainerRepository,
    tenant_id: TENANT,
    matter_id: retainerMatter,
    source_items: [retainerFirst],
    rate_card: retainerRate,
    actor_id: ACTOR,
    idempotency_key: "retainer-split-batch-one",
  });
  const retainerBatchTwo = generateWipFromApprovedItems({
    repository: retainerRepository,
    tenant_id: TENANT,
    matter_id: retainerMatter,
    source_items: [retainerSecond],
    rate_card: retainerRate,
    actor_id: ACTOR,
    idempotency_key: "retainer-split-batch-two",
  });
  assert.deepEqual(
    [
      retainerBatchOne.wip_items[0].retainer_drawdown_amount,
      retainerBatchTwo.wip_items[0].retainer_drawdown_amount,
    ],
    [100000, 50000],
  );
  assert.deepEqual(
    [retainerBatchOne.wip_items[0].amount, retainerBatchTwo.wip_items[0].amount],
    [0, 50000],
  );
  t.diagnostic(JSON.stringify({
    fixed_amounts: [fixedBatchOne.wip_items[0].amount, fixedBatchTwo.wip_items[0].amount],
    success_amounts: [
      successBatchOne.wip_items[0].amount,
      successBatchTwo.wip_items[0].amount,
      successBatchThree.wip_items[0].amount,
    ],
    retainer_drawdowns: [
      retainerBatchOne.wip_items[0].retainer_drawdown_amount,
      retainerBatchTwo.wip_items[0].retainer_drawdown_amount,
    ],
    retainer_net_amounts: [
      retainerBatchOne.wip_items[0].amount,
      retainerBatchTwo.wip_items[0].amount,
    ],
  }));
});

test("[H3] WIP rejects modern implicit terms and tightly bounds legacy hourly fallback", (t) => {
  const modernRepository = createFinanceRepository();
  const modernMatter = `${MATTER}-modern-unlocked`;
  const modernRate = createBillingTerms(modernRepository, { matterId: modernMatter });
  const unlocked = seedModernUnlockedApprovedTime(modernRepository, {
    id: "modern-approved-unlocked",
    matterId: modernMatter,
  });
  let unlockedError;
  assert.throws(
    () => generateWipFromApprovedItems({
      repository: modernRepository,
      tenant_id: TENANT,
      matter_id: modernMatter,
      source_items: [unlocked],
      rate_card: modernRate,
      actor_id: ACTOR,
      idempotency_key: "modern-approved-unlocked-wip",
    }),
    (error) => {
      unlockedError = error;
      return error.code === "WEEKLY_TIME_NOT_LOCKED" && error.status === 409;
    },
  );
  assert.equal(modernRepository.list({
    tenant_id: TENANT,
    matter_id: modernMatter,
    model_type: "WipItem",
  }).length, 0);

  const modernLockedRepository = createFinanceRepository();
  const modernLockedMatter = `${MATTER}-modern-locked-no-arrangement`;
  const modernLockedRate = createRateCard({
    repository: modernLockedRepository,
    rate_card: {
      rate_card_id: "modern-locked-only-rate",
      tenant_id: TENANT,
      currency: "KRW",
      effective_from: "2026-07-01",
      role_rates: [{ role_id: "partner", hourly_rate: 100000 }],
    },
    actor_id: ACTOR,
    idempotency_key: "modern-locked-only-rate",
  }).rate_card;
  const modernLocked = approvedTime(modernLockedRepository, {
    id: "modern-locked-no-arrangement",
    matterId: modernLockedMatter,
  });
  assert.equal(modernLocked.status, "locked");
  assert.equal(Object.hasOwn(modernLocked, "submitted_at"), true);
  assert.equal(Object.hasOwn(modernLocked, "locked_at"), true);
  let modernLockedError;
  assert.throws(
    () => generateWipFromApprovedItems({
      repository: modernLockedRepository,
      tenant_id: TENANT,
      matter_id: modernLockedMatter,
      source_items: [modernLocked],
      rate_card: modernLockedRate,
      actor_id: ACTOR,
      idempotency_key: "modern-locked-no-arrangement-wip",
    }),
    (error) => {
      modernLockedError = error;
      return /explicit canonical FeeArrangement is required for modern TimeEntry WIP/.test(error.message);
    },
  );
  assert.equal(modernLockedRepository.list({
    tenant_id: TENANT,
    matter_id: modernLockedMatter,
    model_type: "FeeArrangement",
  }).length, 0);
  assert.equal(modernLockedRepository.list({
    tenant_id: TENANT,
    matter_id: modernLockedMatter,
    model_type: "WipItem",
  }).length, 0);

  const legacyMatter = `${MATTER}-legacy-default`;
  const legacyRepository = createFinanceRepository({
    seedRecords: [
      {
        model_type: "RateCard",
        rate_card_id: "legacy-canonical-rate",
        tenant_id: TENANT,
        currency: "KRW",
        effective_from: "2026-06-20",
        role_rates: [{ role_id: "partner", hourly_rate: 400000 }],
        status: "active",
      },
      {
        model_type: "TimeEntry",
        time_entry_id: "legacy-approved-time",
        tenant_id: TENANT,
        matter_id: legacyMatter,
        actor_id: ACTOR,
        role_id: "partner",
        work_date: "2026-06-20",
        narrative: "Legacy approved time",
        duration_minutes: 60,
        billable: true,
        status: "approved",
        approved_for_wip: true,
      },
    ],
  });
  const legacyRate = legacyRepository.get({
    tenant_id: TENANT,
    model_type: "RateCard",
    rate_card_id: "legacy-canonical-rate",
  });
  const legacyTime = legacyRepository.get({
    tenant_id: TENANT,
    model_type: "TimeEntry",
    time_entry_id: "legacy-approved-time",
  });
  assert.equal(legacyTime.status, "approved");
  assert.equal(legacyTime.approved_for_wip, true);
  assert.equal(Object.hasOwn(legacyTime, "submitted_at"), false);
  assert.equal(Object.hasOwn(legacyTime, "locked_at"), false);
  legacyRepository.create({
    model_type: "RateCard",
    rate_card_id: "legacy-ambiguous-rate",
    tenant_id: TENANT,
    currency: "KRW",
    effective_from: "2026-06-20",
    role_rates: [{ role_id: "partner", hourly_rate: 1 }],
    status: "active",
  });
  let ambiguousRateError;
  assert.throws(
    () => generateWipFromApprovedItems({
      repository: legacyRepository,
      tenant_id: TENANT,
      matter_id: legacyMatter,
      rate_card: legacyRate,
      actor_id: ACTOR,
      idempotency_key: "legacy-ambiguous-default-wip",
    }),
    (error) => {
      ambiguousRateError = error;
      return /canonical default RateCard is ambiguous/.test(error.message);
    },
  );
  assert.equal(legacyRepository.list({
    tenant_id: TENANT,
    matter_id: legacyMatter,
    model_type: "FeeArrangement",
  }).length, 0);
  legacyRepository.update(
    { tenant_id: TENANT, model_type: "RateCard", rate_card_id: "legacy-ambiguous-rate" },
    { status: "inactive", updates_database_rows: true },
  );
  const request = {
    repository: legacyRepository,
    tenant_id: TENANT,
    matter_id: legacyMatter,
    rate_card: legacyRate,
    actor_id: ACTOR,
    idempotency_key: "legacy-default-wip",
  };
  const created = generateWipFromApprovedItems(request);
  const replay = generateWipFromApprovedItems(request);
  const [defaultArrangement] = legacyRepository.list({
    tenant_id: TENANT,
    matter_id: legacyMatter,
    model_type: "FeeArrangement",
  });
  assert.equal(created.wip_items[0].amount, 400000);
  assert.equal(created.wip_items[0].fee_arrangement_id, defaultArrangement.fee_arrangement_id);
  assert.equal(defaultArrangement.rate_card_id, legacyRate.rate_card_id);
  assert.equal(defaultArrangement.type, "hourly");
  assert.equal(defaultArrangement.canonical_default_terms, true);
  assert.equal(defaultArrangement.server_created_default, true);
  assert.equal(
    defaultArrangement.legacy_compatibility_predicate,
    "approved_for_wip_without_weekly_workflow_fields_v1",
  );
  assert.deepEqual(defaultArrangement.legacy_source_refs, ["legacy-approved-time"]);
  assert.equal(
    created.audit_event.metadata.legacy_compatibility_predicate,
    defaultArrangement.legacy_compatibility_predicate,
  );
  assert.deepEqual(created.audit_event.metadata.legacy_source_refs, ["legacy-approved-time"]);
  assert.equal(replay.idempotent_replay, true);
  assert.equal(legacyRepository.list({
    tenant_id: TENANT,
    matter_id: legacyMatter,
    model_type: "FeeArrangement",
  }).length, 1);

  const modernAfterLegacy = approvedTime(legacyRepository, {
    id: "modern-after-legacy-default",
    matterId: legacyMatter,
    workDate: "2026-07-21",
  });
  let legacyDefaultReuseError;
  assert.throws(
    () => generateWipFromApprovedItems({
      repository: legacyRepository,
      tenant_id: TENANT,
      matter_id: legacyMatter,
      source_items: [modernAfterLegacy],
      rate_card: legacyRate,
      fee_arrangement_id: defaultArrangement.fee_arrangement_id,
      actor_id: ACTOR,
      idempotency_key: "modern-after-legacy-default-wip",
    }),
    (error) => {
      legacyDefaultReuseError = error;
      return /explicit canonical FeeArrangement is required for modern TimeEntry WIP/.test(error.message);
    },
  );
  assert.equal(legacyRepository.list({
    tenant_id: TENANT,
    matter_id: legacyMatter,
    model_type: "WipItem",
  }).some((item) => item.source_id === modernAfterLegacy.time_entry_id), false);

  t.diagnostic(JSON.stringify({
    unlocked_error: { code: unlockedError.code, status: unlockedError.status },
    modern_locked_error: modernLockedError.message,
    modern_locked_default_arrangements: modernLockedRepository.list({
      tenant_id: TENANT,
      matter_id: modernLockedMatter,
      model_type: "FeeArrangement",
    }).length,
    ambiguous_default_error: ambiguousRateError.message,
    legacy_wip_amount: created.wip_items[0].amount,
    legacy_fee_arrangement_id: defaultArrangement.fee_arrangement_id,
    legacy_rate_card_id: defaultArrangement.rate_card_id,
    legacy_default_terms: defaultArrangement.canonical_default_terms,
    legacy_compatibility_predicate: defaultArrangement.legacy_compatibility_predicate,
    legacy_source_refs: defaultArrangement.legacy_source_refs,
    legacy_has_weekly_workflow_fields:
      Object.hasOwn(legacyTime, "submitted_at") || Object.hasOwn(legacyTime, "locked_at"),
    legacy_default_reuse_error: legacyDefaultReuseError.message,
    legacy_replay: replay.idempotent_replay,
  }));
});

test("[H-WIP-PROVENANCE] WIP generation rejects untrusted source and pricing projections", () => {
  const repository = createFinanceRepository();
  const matterId = `${MATTER}-provenance`;
  const rateCard = createBillingTerms(repository, { matterId });
  const arrangement = repository
    .list({ tenant_id: TENANT, matter_id: matterId, model_type: "FeeArrangement" })
    .at(-1);
  const canonicalSource = repository.create({
    model_type: "TimeEntry",
    time_entry_id: "source-provenance",
    tenant_id: TENANT,
    matter_id: matterId,
    role_id: "partner",
    work_date: "2026-07-28",
    duration_minutes: 60,
    billable: true,
    status: "approved",
  });
  const unrelatedRateCard = createRateCard({
    repository,
    rate_card: {
      rate_card_id: "rate-unrelated-provenance",
      tenant_id: TENANT,
      currency: "KRW",
      effective_from: "2026-07-01",
      role_rates: [{ role_id: "partner", hourly_rate: 200000 }],
    },
    actor_id: ACTOR,
    idempotency_key: "rate-unrelated-provenance",
  }).rate_card;
  const request = {
    repository,
    tenant_id: TENANT,
    matter_id: matterId,
    source_items: [canonicalSource],
    rate_card: rateCard,
    fee_arrangement: arrangement,
    actor_id: ACTOR,
  };
  assert.throws(
    () => generateWipFromApprovedItems({
      ...request,
      source_items: [{ model_type: "TimeEntry", time_entry_id: canonicalSource.time_entry_id, matter_id: matterId }],
      idempotency_key: "provenance-tenantless-source",
    }),
    /tenant_id is required/,
  );
  assert.throws(
    () => generateWipFromApprovedItems({
      ...request,
      source_items: [{ ...canonicalSource, tenant_id: "tenant-attacker" }],
      idempotency_key: "provenance-cross-tenant-source",
    }),
    /source item tenant must match WIP tenant/,
  );
  assert.throws(
    () => generateWipFromApprovedItems({
      ...request,
      source_items: [{ ...canonicalSource, matter_id: "matter-attacker" }],
      idempotency_key: "provenance-cross-matter-source",
    }),
    /source item Matter must match WIP Matter/,
  );
  assert.throws(
    () => generateWipFromApprovedItems({
      ...request,
      source_items: [{
        model_type: "TimeEntry",
        time_entry_id: "source-not-persisted",
        tenant_id: TENANT,
        matter_id: matterId,
      }],
      idempotency_key: "provenance-unpersisted-source",
    }),
    /source item must exist in the canonical finance repository/,
  );
  assert.throws(
    () => generateWipFromApprovedItems({
      ...request,
      source_items: [{ ...canonicalSource, duration_minutes: 6000 }],
      idempotency_key: "provenance-forged-duration",
    }),
    /source item differs from its canonical finance record/,
  );
  assert.throws(
    () => generateWipFromApprovedItems({
      ...request,
      fee_arrangement: { fee_arrangement_id: arrangement.fee_arrangement_id, matter_id: matterId },
      idempotency_key: "provenance-tenantless-arrangement",
    }),
    /tenant_id is required/,
  );
  assert.throws(
    () => generateWipFromApprovedItems({
      ...request,
      fee_arrangement: { ...arrangement, matter_id: "matter-attacker" },
      idempotency_key: "provenance-cross-matter-arrangement",
    }),
    /FeeArrangement Matter must match WIP Matter/,
  );
  assert.throws(
    () => generateWipFromApprovedItems({
      ...request,
      fee_arrangement: { ...arrangement, type: "fixed", arrangement_type: "fixed", fixed_fee_amount: 1 },
      idempotency_key: "provenance-forged-arrangement",
    }),
    /FeeArrangement differs from its canonical finance record/,
  );
  assert.throws(
    () => generateWipFromApprovedItems({
      ...request,
      rate_card: {
        ...rateCard,
        role_rates: [{ role_id: "partner", hourly_rate: 1 }],
      },
      idempotency_key: "provenance-forged-rate",
    }),
    /RateCard differs from its canonical finance record/,
  );
  assert.throws(
    () => generateWipFromApprovedItems({
      ...request,
      rate_card: {
        rate_card_id: rateCard.rate_card_id,
        currency: rateCard.currency,
        role_rates: rateCard.role_rates,
      },
      idempotency_key: "provenance-tenantless-rate",
    }),
    /tenant_id is required/,
  );
  assert.throws(
    () => generateWipFromApprovedItems({
      ...request,
      rate_card: unrelatedRateCard,
      idempotency_key: "provenance-unlinked-rate",
    }),
    /RateCard must exactly match the FeeArrangement link/,
  );
  assert.equal(repository.list({ tenant_id: TENANT, matter_id: matterId, model_type: "WipItem" }).length, 0);

  const valid = generateWipFromApprovedItems({
    repository,
    tenant_id: TENANT,
    matter_id: matterId,
    source_items: [{
      model_type: "TimeEntry",
      time_entry_id: canonicalSource.time_entry_id,
      tenant_id: TENANT,
      matter_id: matterId,
    }],
    fee_arrangement_id: arrangement.fee_arrangement_id,
    actor_id: ACTOR,
    idempotency_key: "provenance-valid-ref-only",
  });
  assert.equal(valid.wip_items[0].amount, 100000);
  assert.equal(valid.wip_items[0].fee_arrangement_id, arrangement.fee_arrangement_id);
});

test("[H4] invoice creation rejects lifecycle outcomes and contradictory opening balances", () => {
  const repository = createFinanceRepository();
  const { matterId, prebill } = buildApprovedPreBill(repository, "create-constraints");
  const baseInvoice = {
    tenant_id: TENANT,
    matter_id: matterId,
    prebill_id: prebill.prebill_id,
    billing_client_party_id: "client-create-constraints",
    currency: "KRW",
  };
  for (const status of ["sent", "partial", "paid", "overdue", "void"]) {
    assert.throws(
      () => createInvoiceFromPreBill({
        repository,
        invoice: { ...baseInvoice, invoice_id: `invoice-invalid-${status}`, status },
        actor_id: ACTOR,
        idempotency_key: `invoice-invalid-${status}`,
      }),
      /only supports draft or legacy issued status/,
    );
  }
  assert.throws(
    () => createInvoiceFromPreBill({
      repository,
      invoice: { ...baseInvoice, invoice_id: "invoice-invalid-paid-amount", status: "draft", amount_paid: 1 },
      actor_id: ACTOR,
      idempotency_key: "invoice-invalid-paid-amount",
    }),
    /amount_paid must be zero/,
  );
  assert.throws(
    () => createInvoiceFromPreBill({
      repository,
      invoice: { ...baseInvoice, invoice_id: "invoice-invalid-outstanding", status: "draft", outstanding_amount: 1 },
      actor_id: ACTOR,
      idempotency_key: "invoice-invalid-outstanding",
    }),
    /outstanding_amount must equal amount_due/,
  );
  assert.equal(repository.list({ tenant_id: TENANT, model_type: "Invoice" }).length, 0);
});

test("[H5] finance receipts reject changed payload, actor, and cross-operation key reuse with typed 409", () => {
  const repository = createFinanceRepository();
  const { matterId, prebill } = buildApprovedPreBill(repository, "idempotency");
  const request = {
    repository,
    invoice: {
      invoice_id: "invoice-idempotency",
      tenant_id: TENANT,
      matter_id: matterId,
      prebill_id: prebill.prebill_id,
      billing_client_party_id: "client-idempotency",
      currency: "KRW",
      status: "draft",
    },
    actor_id: ACTOR,
    idempotency_key: "invoice-idempotency-key",
  };
  const created = createInvoiceFromPreBill(request);
  assert.equal(createInvoiceFromPreBill(request).idempotent_replay, true);
  const receipt = repository.snapshot().idempotency.find((item) => item.idempotency_key === request.idempotency_key);
  assert.equal(receipt.operation, "invoice_create");
  assert.equal(receipt.actor_id, ACTOR);
  assert.equal(receipt.object_type, "PreBill");
  assert.equal(receipt.object_id, prebill.prebill_id);
  assert.match(receipt.request_fingerprint, /^[a-f0-9]{64}$/);

  const isTypedConflict = (error) =>
    error instanceof FinanceIdempotencyConflictError &&
    error.code === "FINANCE_IDEMPOTENCY_CONFLICT" &&
    error.safe_error_code === "IDEMPOTENCY_CONFLICT" &&
    error.status === 409 &&
    error.status_code === 409;
  assert.throws(
    () => createInvoiceFromPreBill({
      ...request,
      invoice: { ...request.invoice, billing_client_party_id: "changed-client" },
    }),
    isTypedConflict,
  );
  assert.throws(
    () => createInvoiceFromPreBill({ ...request, actor_id: "different-actor" }),
    isTypedConflict,
  );
  assert.throws(
    () => transitionInvoiceLifecycle({
      repository,
      tenant_id: TENANT,
      invoice_id: created.invoice.invoice_id,
      to_status: "sent",
      actor_id: ACTOR,
      idempotency_key: request.idempotency_key,
    }),
    isTypedConflict,
  );
  assert.equal(repository.list({ tenant_id: TENANT, model_type: "Invoice" }).length, 1);
});
