import assert from "node:assert/strict";
import test from "node:test";

import { createFinanceRepository } from "../../billing/src/finance-repository.js";
import {
  approveTimeEntryForWip,
  createQuickTimeEntry,
  createTimeEntry,
  listWeeklyTimeCompleteness,
  submitTimeWeek,
  lockTimeWeek,
  unlockTimeWeekWithinGrace,
  updateTimeEntry,
  listWipCandidateTimeEntries,
} from "../src/index.js";

const TENANT = "tenant-small-firm-time";
const MATTER = "matter-small-firm-time";
const ACTOR = "actor-small-firm-time";
let quickSequence = 0;

function quick(repository, overrides = {}) {
  return createQuickTimeEntry({
    repository,
    tenant_id: TENANT,
    matter_id: MATTER,
    actor_id: ACTOR,
    role_id: "partner",
    work_date: "2026-07-27",
    duration_minutes: 60,
    narrative: "Review matter correspondence",
    billable: true,
    idempotency_key: `quick-${++quickSequence}`,
    ...overrides,
  });
}

test("[TUW-30] quick Matter-linked time entry persists once and replays by idempotency key", () => {
  const repository = createFinanceRepository();
  const input = {
    repository,
    tenant_id: TENANT,
    matter_id: MATTER,
    actor_id: ACTOR,
    role_id: "partner",
    work_date: "2026-07-27",
    duration_minutes: 90,
    narrative: "Prepare the next filing",
    billable: true,
    idempotency_key: "quick-fixed-1",
    status: "locked",
    approved_for_wip: true,
    submitted_at: "2026-07-31T00:00:00.000Z",
    locked_at: "2026-07-31T00:01:00.000Z",
    model_type: "Invoice",
    owner_module: "attacker",
  };
  const first = createQuickTimeEntry(input);
  const replay = createQuickTimeEntry(input);

  assert.equal(first.outcome, "created");
  assert.equal(first.replayed, false);
  assert.equal(first.item.matter_id, MATTER);
  assert.equal(first.item.duration_minutes, 90);
  assert.equal(first.item.status, "draft");
  assert.equal(first.item.approved_for_wip, false);
  assert.equal(first.item.submitted_at, null);
  assert.equal(first.item.locked_at, null);
  assert.equal(first.item.model_type, "TimeEntry");
  assert.equal(first.item.actor_id, ACTOR);
  assert.equal(first.item.owner_module, "finance");
  assert.equal(replay.replayed, true);
  assert.equal(replay.item.time_entry_id, first.item.time_entry_id);
  assert.equal(repository.list({ tenant_id: TENANT, model_type: "TimeEntry" }).length, 1);
  assert.equal(repository.listAudit({ tenant_id: TENANT }).filter((event) => event.action === "time.entry.create").length, 1);
  assert.throws(
    () => createQuickTimeEntry({ ...input, duration_minutes: 91 }),
    /idempotency key was already used for a different finance request/,
  );
  assert.throws(() => createQuickTimeEntry({ ...input, idempotency_key: "quick-invalid", duration_minutes: 0 }), /duration_minutes must be positive/);

  const directRepository = createFinanceRepository();
  const direct = createTimeEntry({
    repository: directRepository,
    actor_id: ACTOR,
    idempotency_key: "direct-adversarial-1",
    time_entry: {
      time_entry_id: "direct-adversarial-entry",
      tenant_id: TENANT,
      matter_id: MATTER,
      role_id: "partner",
      work_date: "2026-07-27",
      narrative: "Direct create remains a draft",
      duration_minutes: 30,
      billable: true,
      actor_id: "attacker",
      status: "approved",
      approved_for_wip: true,
      submitted_at: "2026-07-31T00:00:00.000Z",
      locked_at: "2026-07-31T00:01:00.000Z",
      model_type: "Invoice",
    },
  });
  assert.equal(direct.item.status, "draft");
  assert.equal(direct.item.approved_for_wip, false);
  assert.equal(direct.item.submitted_at, null);
  assert.equal(direct.item.locked_at, null);
  assert.equal(direct.item.actor_id, ACTOR);
  assert.equal(direct.item.model_type, "TimeEntry");
});

test("explicit partner WIP approval persists a lock marker without taking over the weekly workflow status", () => {
  const repository = createFinanceRepository();
  const created = quick(repository, { idempotency_key: "explicit-partner-approval" });
  const approved = approveTimeEntryForWip({
    repository,
    tenant_id: TENANT,
    time_entry_id: created.item.time_entry_id,
    actor_id: "partner-approver",
    idempotency_key: "explicit-partner-approval-lock",
  });

  assert.equal(approved.item.status, "approved");
  assert.equal(approved.item.approved_for_wip, true);
  assert.match(approved.item.locked_at, /^\d{4}-\d{2}-\d{2}T/);
  assert.equal(approved.item.submitted_at, null);
  assert.equal(repository.get({
    tenant_id: TENANT,
    model_type: "TimeEntry",
    time_entry_id: created.item.time_entry_id,
  }).locked_at, approved.item.locked_at);
});

test("[TUW-31] weekly completeness returns person totals and weekday gaps", () => {
  const repository = createFinanceRepository();
  quick(repository, { idempotency_key: "week-a-mon", work_date: "2026-07-27", duration_minutes: 60 });
  quick(repository, { idempotency_key: "week-a-tue", work_date: "2026-07-28", duration_minutes: 30 });
  quick(repository, { idempotency_key: "week-b-wed", actor_id: "actor-b", work_date: "2026-07-29", duration_minutes: 120 });

  const result = listWeeklyTimeCompleteness({
    repository,
    tenant_id: TENANT,
    week_start: "2026-07-27",
    actor_ids: [ACTOR, "actor-b"],
    now: "2026-07-30T04:00:00.000Z",
  });

  const actorA = result.items.find((item) => item.actor_id === ACTOR);
  const actorB = result.items.find((item) => item.actor_id === "actor-b");
  assert.equal(result.summary.total_minutes, 210);
  assert.deepEqual(actorA.entered_dates, ["2026-07-27", "2026-07-28"]);
  assert.deepEqual(actorA.missing_days, ["2026-07-29", "2026-07-30", "2026-07-31"]);
  assert.equal(actorA.total_minutes, 90);
  assert.deepEqual(actorB.missing_days, ["2026-07-27", "2026-07-28", "2026-07-30", "2026-07-31"]);
  assert.equal(actorB.complete, false);
});

test("[TUW-32] weekly submit/lock writes timestamps, preserves WIP approval, and allows explicit grace unlock only", () => {
  const repository = createFinanceRepository();
  const created = quick(repository, { idempotency_key: "lock-contract-1" });
  const entryId = created.item.time_entry_id;
  const mutable = quick(repository, { idempotency_key: "mutable-entry-1" });
  assert.throws(
    () => updateTimeEntry({
      repository,
      tenant_id: TENANT,
      time_entry_id: mutable.item.time_entry_id,
      actor_id: ACTOR,
      idempotency_key: "mutable-status-patch",
      patch: { status: "approved" },
    }),
    /not editable/,
  );
  assert.throws(
    () => updateTimeEntry({
      repository,
      tenant_id: TENANT,
      time_entry_id: mutable.item.time_entry_id,
      actor_id: ACTOR,
      idempotency_key: "mutable-approval-patch",
      patch: { approved_for_wip: true },
    }),
    /not editable/,
  );
  assert.throws(
    () => updateTimeEntry({
      repository,
      tenant_id: TENANT,
      time_entry_id: mutable.item.time_entry_id,
      actor_id: ACTOR,
      idempotency_key: "mutable-lock-patch",
      patch: { locked_at: "2026-07-31T01:00:00.000Z" },
    }),
    /not editable/,
  );
  const mutableAfterAttempts = repository.get({ tenant_id: TENANT, model_type: "TimeEntry", time_entry_id: mutable.item.time_entry_id });
  assert.equal(mutableAfterAttempts.status, "draft");
  assert.equal(mutableAfterAttempts.approved_for_wip, false);
  assert.equal(mutableAfterAttempts.locked_at, null);
  const mutableUpdate = updateTimeEntry({
    repository,
    tenant_id: TENANT,
    time_entry_id: mutable.item.time_entry_id,
    actor_id: ACTOR,
    idempotency_key: "mutable-update-1",
    patch: { narrative: "Corrected narrative" },
  });
  assert.equal(mutableUpdate.item.narrative, "Corrected narrative");
  assert.equal(updateTimeEntry({
    repository,
    tenant_id: TENANT,
    time_entry_id: mutable.item.time_entry_id,
    actor_id: ACTOR,
    idempotency_key: "mutable-update-1",
    patch: { narrative: "Corrected narrative" },
  }).replayed, true);
  assert.throws(
    () => updateTimeEntry({
      repository,
      tenant_id: TENANT,
      time_entry_id: mutable.item.time_entry_id,
      actor_id: ACTOR,
      idempotency_key: "mutable-update-1",
      patch: { narrative: "Changed replay payload" },
    }),
    /idempotency key was already used for a different finance request/,
  );
  const submitted = submitTimeWeek({
    repository,
    tenant_id: TENANT,
    actor_id: ACTOR,
    time_entry_ids: [entryId],
    week_start: "2026-07-27",
    idempotency_key: "week-submit-1",
    now: "2026-07-31T01:00:00.000Z",
  });
  const locked = lockTimeWeek({
    repository,
    tenant_id: TENANT,
    actor_id: ACTOR,
    time_entry_ids: [entryId],
    week_start: "2026-07-27",
    idempotency_key: "week-lock-1",
    now: "2026-07-31T01:00:00.000Z",
  });

  assert.equal(submitted.items[0].submitted_at, "2026-07-31T01:00:00.000Z");
  assert.equal(locked.items[0].status, "locked");
  assert.equal(locked.items[0].approved_for_wip, true);
  assert.equal(locked.items[0].locked_at, "2026-07-31T01:00:00.000Z");
  assert.equal(locked.items[0].grace_expires_at, "2026-07-31T01:15:00.000Z");
  assert.throws(
    () => updateTimeEntry({ repository, tenant_id: TENANT, time_entry_id: entryId, actor_id: ACTOR, idempotency_key: "locked-edit", patch: { narrative: "late edit" } }),
    /locked time entry cannot be modified/,
  );

  const unlocked = unlockTimeWeekWithinGrace({
    repository,
    tenant_id: TENANT,
    actor_id: ACTOR,
    time_entry_ids: [entryId],
    week_start: "2026-07-27",
    reason: "Correct matter narrative",
    idempotency_key: "week-unlock-1",
    now: "2026-07-31T01:10:00.000Z",
  });
  assert.equal(unlocked.items[0].locked_at, null);
  assert.equal(unlocked.items[0].unlock_reason, "Correct matter narrative");
  assert.equal(repository.listAudit({ tenant_id: TENANT }).filter((event) => event.action === "time.entry.week.unlock").length, 1);

  const legacy = quick(repository, { idempotency_key: "legacy-approved", work_date: "2026-07-28" });
  repository.update({ tenant_id: TENANT, model_type: "TimeEntry", time_entry_id: legacy.item.time_entry_id }, { status: "approved", approved_for_wip: true });
  const legacyCompleteness = listWeeklyTimeCompleteness({ repository, tenant_id: TENANT, week_start: "2026-07-27", actor_ids: [ACTOR] });
  assert.equal(legacyCompleteness.summary.entry_count, 3);

  const lockedAgain = lockTimeWeek({
    repository,
    tenant_id: TENANT,
    actor_id: ACTOR,
    time_entry_ids: [entryId],
    week_start: "2026-07-27",
    idempotency_key: "week-lock-2",
    now: "2026-07-31T02:00:00.000Z",
  });
  assert.equal(lockedAgain.items[0].approved_for_wip, true);
  assert.throws(
    () => unlockTimeWeekWithinGrace({
      repository,
      tenant_id: TENANT,
      actor_id: ACTOR,
      time_entry_ids: [entryId],
      week_start: "2026-07-27",
      reason: "Too late",
      idempotency_key: "week-unlock-expired",
      now: "2026-07-31T02:16:00.000Z",
    }),
    /grace expired/,
  );
});

test("[H3] WIP and later billing lineage block grace unlock and stale edits", (t) => {
  const repository = createFinanceRepository();
  const created = quick(repository, {
    idempotency_key: "consumed-entry",
    narrative: "Original consumed narrative",
  });
  const entryId = created.item.time_entry_id;
  submitTimeWeek({
    repository,
    tenant_id: TENANT,
    actor_id: ACTOR,
    time_entry_ids: [entryId],
    week_start: "2026-07-27",
    idempotency_key: "consumed-entry-submit",
    now: "2026-07-31T01:00:00.000Z",
  });
  lockTimeWeek({
    repository,
    tenant_id: TENANT,
    actor_id: ACTOR,
    time_entry_ids: [entryId],
    week_start: "2026-07-27",
    idempotency_key: "consumed-entry-lock",
    now: "2026-07-31T01:00:00.000Z",
  });
  repository.create({
    model_type: "WipItem",
    wip_item_id: "wip-consumed-entry",
    tenant_id: TENANT,
    matter_id: MATTER,
    source_model_type: "TimeEntry",
    source_id: entryId,
    amount: 100000,
    status: "open",
  });

  let unlockError;
  assert.throws(
    () => unlockTimeWeekWithinGrace({
      repository,
      tenant_id: TENANT,
      actor_id: ACTOR,
      time_entry_ids: [entryId],
      week_start: "2026-07-27",
      reason: "Attempt stale correction",
      idempotency_key: "consumed-entry-unlock",
      now: "2026-07-31T01:05:00.000Z",
    }),
    (error) => {
      unlockError = error;
      return error.code === "TIME_ENTRY_BILLING_LINEAGE_CONFLICT" && error.status === 409;
    },
  );
  assert.equal(repository.get({
    tenant_id: TENANT,
    model_type: "TimeEntry",
    time_entry_id: entryId,
  }).locked_at, "2026-07-31T01:00:00.000Z");
  assert.equal(repository.listAudit({ tenant_id: TENANT })
    .filter((event) => event.action === "time.entry.week.unlock").length, 0);

  repository.update(
    { tenant_id: TENANT, model_type: "TimeEntry", time_entry_id: entryId },
    { status: "submitted", locked_at: null, updates_database_rows: true },
  );
  let staleEditError;
  assert.throws(
    () => updateTimeEntry({
      repository,
      tenant_id: TENANT,
      time_entry_id: entryId,
      actor_id: ACTOR,
      idempotency_key: "consumed-entry-stale-edit",
      patch: { narrative: "Stale edited narrative" },
    }),
    (error) => {
      staleEditError = error;
      return error.code === "TIME_ENTRY_BILLING_LINEAGE_CONFLICT" && error.status === 409;
    },
  );
  assert.equal(repository.get({
    tenant_id: TENANT,
    model_type: "TimeEntry",
    time_entry_id: entryId,
  }).narrative, "Original consumed narrative");

  const invoiced = quick(repository, {
    idempotency_key: "direct-invoice-line-entry",
    narrative: "Invoice-line consumed narrative",
  });
  repository.create({
    model_type: "InvoiceLine",
    invoice_line_id: "invoice-line-direct-time-source",
    invoice_id: "invoice-direct-time-source",
    tenant_id: TENANT,
    matter_id: MATTER,
    source_model_type: "TimeEntry",
    source_id: invoiced.item.time_entry_id,
    amount: 100000,
  });
  let invoiceLineEditError;
  assert.throws(
    () => updateTimeEntry({
      repository,
      tenant_id: TENANT,
      time_entry_id: invoiced.item.time_entry_id,
      actor_id: ACTOR,
      idempotency_key: "direct-invoice-line-stale-edit",
      patch: { narrative: "Edited after invoice lineage" },
    }),
    (error) => {
      invoiceLineEditError = error;
      return error.code === "TIME_ENTRY_BILLING_LINEAGE_CONFLICT" && error.status === 409;
    },
  );
  assert.equal(repository.listAudit({ tenant_id: TENANT })
    .filter((event) => event.action === "time.entry.update").length, 0);
  t.diagnostic(JSON.stringify({
    unlock_error: { code: unlockError.code, status: unlockError.status },
    stale_edit_error: { code: staleEditError.code, status: staleEditError.status },
    invoice_line_edit_error: { code: invoiceLineEditError.code, status: invoiceLineEditError.status },
    unlock_audit_count: 0,
    update_audit_count: 0,
    retained_narrative: repository.get({
      tenant_id: TENANT,
      model_type: "TimeEntry",
      time_entry_id: entryId,
    }).narrative,
  }));
});

test("[TUW-33] WIP candidates only project billable lock eligibility and leave pricing to billing", () => {
  const repository = createFinanceRepository();
  repository.create({
    model_type: "TimeEntry",
    time_entry_id: "candidate-legacy",
    tenant_id: TENANT,
    matter_id: MATTER,
    actor_id: ACTOR,
    role_id: "partner",
    work_date: "2026-07-27",
    duration_minutes: 60,
    narrative: "Legacy approved row",
    billable: true,
    status: "approved",
    approved_for_wip: true,
  });
  repository.create({
    model_type: "TimeEntry",
    time_entry_id: "candidate-nonbillable",
    tenant_id: TENANT,
    matter_id: MATTER,
    actor_id: ACTOR,
    role_id: "partner",
    work_date: "2026-07-27",
    duration_minutes: 60,
    narrative: "Internal admin",
    billable: false,
    status: "locked",
    approved_for_wip: true,
  });
  repository.create({
    model_type: "TimeEntry",
    time_entry_id: "candidate-missing-rate",
    tenant_id: TENANT,
    matter_id: MATTER,
    actor_id: ACTOR,
    role_id: "unknown-role",
    work_date: "2026-07-28",
    duration_minutes: 30,
    narrative: "Needs pricing review",
    billable: true,
    status: "locked",
    approved_for_wip: true,
  });
  repository.create({
    model_type: "TimeEntry",
    time_entry_id: "candidate-unlocked",
    tenant_id: TENANT,
    matter_id: MATTER,
    actor_id: ACTOR,
    role_id: "partner",
    work_date: "2026-07-28",
    duration_minutes: 30,
    narrative: "Submitted but not locked",
    billable: true,
    status: "approved",
    approved_for_wip: true,
    submitted_at: "2026-07-31T00:00:00.000Z",
    locked_at: null,
  });
  repository.create({
    model_type: "TimeEntry",
    time_entry_id: "candidate-invoiced",
    tenant_id: TENANT,
    matter_id: MATTER,
    actor_id: ACTOR,
    role_id: "partner",
    work_date: "2026-07-28",
    duration_minutes: 30,
    narrative: "Already billed",
    billable: true,
    status: "locked",
    approved_for_wip: true,
    invoice_id: "invoice-existing",
  });

  const result = listWipCandidateTimeEntries({ repository, tenant_id: TENANT, as_of_date: "2026-07-31" });
  const candidate = result.items.find((item) => item.time_entry_id === "candidate-legacy");
  const missingRate = result.items.find((item) => item.time_entry_id === "candidate-missing-rate");
  assert.equal(result.summary.candidate_count, 2);
  assert.equal(result.summary.error_count, 1);
  assert.equal(candidate.amount, undefined);
  assert.equal(candidate.lock_state, "legacy_approved");
  assert.equal(missingRate.wip_candidate, true);
  assert.deepEqual(missingRate.errors, []);
  assert.equal(missingRate.rate, undefined);
  assert.equal(missingRate.fee_arrangement_id, undefined);
  const unlocked = result.items.find((item) => item.time_entry_id === "candidate-unlocked");
  assert.equal(unlocked.wip_candidate, false);
  assert.deepEqual(unlocked.errors, ["weekly_time_not_locked"]);
  assert.equal(result.items.some((item) => item.time_entry_id === "candidate-nonbillable"), false);
  assert.equal(result.items.some((item) => item.time_entry_id === "candidate-invoiced"), false);
});
