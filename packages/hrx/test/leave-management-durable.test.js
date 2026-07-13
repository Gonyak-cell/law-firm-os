import assert from "node:assert/strict";
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import { createSqlLeaveBalanceLedger } from "../src/leave/balance.js";
import { createDurableLeaveManagementService } from "../src/leave/management-service.js";
import { runHrxMigrations } from "../src/migrations/index.js";
import { createSqlHrxRepository } from "../src/repository-sql.js";
import { createFileHrxStore } from "../src/store/file-store.js";

const NOW = "2026-07-13T01:00:00.000Z";
const TENANT = "tenant-leave-a";

function stableId(prefix, key = "id") {
  return `${prefix}_${String(key).replace(/[^a-zA-Z0-9]+/g, "_")}`;
}

function seedConfiguration(store, tenantId = TENANT) {
  const repository = createSqlHrxRepository({ store, clock: () => NOW });
  repository.createEmployee({
    tenant_id: tenantId,
    employee_id: "emp-001",
    display_name: "Ari Kim",
    status: "active",
  });
  store.query("insert", {
    table: "hrx_leave_groups",
    row: {
      tenant_id: tenantId,
      group_id: "group-paid",
      code: "PAID_TIME",
      display_name: "유급 휴가",
      status: "active",
      state_version: 1,
    },
  });
  store.query("insert", {
    table: "hrx_leave_types",
    row: {
      tenant_id: tenantId,
      leave_type_id: "type-annual",
      group_id: "group-paid",
      code: "ANNUAL",
      display_name: "연차",
      request_unit: "minutes",
      evidence_rule_json: "{}",
      status: "active",
    },
  });
  store.query("insert", {
    table: "hrx_leave_policy_versions",
    row: {
      tenant_id: tenantId,
      policy_version_id: "policy-2026-v1",
      group_id: "group-paid",
      policy_code: "annual-kr",
      version: 1,
      effective_from: "2026-01-01",
      effective_to: null,
      status: "active",
      rules_json: "{}",
    },
  });
  store.query("insert", {
    table: "hrx_work_schedule_profiles",
    row: {
      tenant_id: tenantId,
      schedule_profile_id: "schedule-seoul-480",
      display_name: "서울 표준 근무",
      timezone: "Asia/Seoul",
      weekly_schedule_json: JSON.stringify({
        1: [{ start: "09:00", end: "12:00" }, { start: "13:00", end: "18:00" }],
        2: [{ start: "09:00", end: "12:00" }, { start: "13:00", end: "18:00" }],
        3: [{ start: "09:00", end: "12:00" }, { start: "13:00", end: "18:00" }],
        4: [{ start: "09:00", end: "12:00" }, { start: "13:00", end: "18:00" }],
        5: [{ start: "09:00", end: "12:00" }, { start: "13:00", end: "18:00" }],
      }),
      holiday_calendar_ref: "KR_PUBLIC_HOLIDAYS",
      effective_from: "2026-01-01",
      effective_to: null,
      state_version: 1,
    },
  });
  store.query("insert", {
    table: "hrx_work_schedule_assignments",
    row: {
      tenant_id: tenantId,
      schedule_assignment_id: "schedule-assignment-001",
      schedule_profile_id: "schedule-seoul-480",
      employee_id: "emp-001",
      organization_id: null,
      priority: 100,
      effective_from: "2026-01-01",
      effective_to: null,
    },
  });
}

function createHarness({ filePath, failureInjector, approverResolver } = {}) {
  const store = createFileHrxStore({ filePath });
  runHrxMigrations(store);
  seedConfiguration(store);
  const service = createDurableLeaveManagementService({
    store,
    clock: () => NOW,
    idFactory: stableId,
    failureInjector,
    approverResolver: approverResolver ?? (() => ({
      actor_id: "manager-001",
      source_assignment_version: "reporting-line-v1",
      valid_from: "2026-01-01T00:00:00.000Z",
      valid_to: null,
    })),
  });
  return { store, service };
}

async function grant(service, { tenantId = TENANT, minutes = 480, idempotencyKey = "grant-001" } = {}) {
  return service.grantEntitlement(
    { tenant_id: tenantId, actor_id: "hr-001" },
    {
      idempotency_key: idempotencyKey,
      entitlement_id: "entitlement-001",
      employee_id: "emp-001",
      group_id: "group-paid",
      policy_version_id: "policy-2026-v1",
      granted_minutes: minutes,
      valid_from: "2026-01-01",
      expires_on: "2026-12-31",
      source_ref: "AccrualRun:2026",
    },
  );
}

function submitInput(overrides = {}) {
  return {
    idempotency_key: "submit-001",
    request_id: "leave-001",
    employee_id: "emp-001",
    leave_type_id: "type-annual",
    policy_version_id: "policy-2026-v1",
    requested_minutes: 480,
    start_date: "2026-07-14",
    end_date: "2026-07-14",
    ...overrides,
  };
}

test("durable leave submission reserves earliest entitlement and approval atomically converts reservation to use", async () => {
  const { store, service } = createHarness();
  await grant(service);
  const submitted = await service.submit(
    { tenant_id: TENANT, actor_id: "user-001" },
    submitInput(),
  );
  assert.equal(submitted.leave_request.state, "submitted");
  const ledger = createSqlLeaveBalanceLedger({ store });
  const reserved = ledger.balance({ tenant_id: TENANT, employee_id: "emp-001", group_id: "group-paid" });
  assert.equal(reserved.available_minutes, 0);
  assert.equal(reserved.reserved_minutes, 480);

  const approved = await service.approve(
    { tenant_id: TENANT, actor_id: "manager-001" },
    {
      idempotency_key: "approve-001",
      request_id: "leave-001",
      applicant_actor_ids: ["emp-001", "user-001"],
      decision_reason: "coverage confirmed",
    },
  );
  assert.equal(approved.leave_request.state, "approved");
  const used = ledger.balance({ tenant_id: TENANT, employee_id: "emp-001", group_id: "group-paid" });
  assert.equal(used.available_minutes, 0);
  assert.equal(used.reserved_minutes, 0);
  assert.equal(used.used_minutes, 480);
  assert.deepEqual(
    store.query("select", { table: "hrx_leave_request_allocations", where: { tenant_id: TENANT, request_id: "leave-001" } })
      .map((row) => row.allocation_phase)
      .sort(),
    ["released", "reserved", "used"],
  );
  assert.equal(store.query("select", { table: "hrx_audit_events", where: { tenant_id: TENANT } }).length, 2);
  assert.equal(store.query("select", { table: "hrx_leave_sync_outbox", where: { tenant_id: TENANT } }).length, 2);
  store.close();
});

test("overdue approval escalation durably assigns a substitute and resolves with the decision", async () => {
  const { store, service } = createHarness();
  await grant(service);
  await service.submit({ tenant_id: TENANT, actor_id: "user-001" }, submitInput());

  await assert.rejects(
    service.escalateApproval(
      { tenant_id: TENANT, actor_id: "hr-001" },
      {
        idempotency_key: "escalate-self-001",
        request_id: "leave-001",
        substitute_actor_id: "user-001",
        applicant_actor_ids: ["emp-001", "user-001"],
        due_at: "2026-07-12T01:00:00.000Z",
      },
    ),
    (error) => error.safe_error_code === "HRX_LEAVE_SELF_APPROVAL_FORBIDDEN",
  );

  const escalated = await service.escalateApproval(
    { tenant_id: TENANT, actor_id: "hr-001" },
    {
      idempotency_key: "escalate-001",
      request_id: "leave-001",
      substitute_actor_id: "manager-002",
      applicant_actor_ids: ["emp-001", "user-001"],
      due_at: "2026-07-12T01:00:00.000Z",
    },
  );
  assert.equal(escalated.escalation.state, "active");

  const approved = await service.approve(
    { tenant_id: TENANT, actor_id: "manager-002" },
    {
      idempotency_key: "approve-escalated-001",
      request_id: "leave-001",
      applicant_actor_ids: ["emp-001", "user-001"],
      decision_reason: "overdue substitute approval",
    },
  );
  assert.equal(approved.leave_request.state, "approved");
  const escalation = store.query("selectOne", {
    table: "hrx_approval_escalations",
    where: { tenant_id: TENANT, escalation_id: escalated.escalation.escalation_id },
  });
  assert.equal(escalation.state, "resolved");
  assert.equal(escalation.resolved_at, NOW);
  store.close();
});

test("leave preview derives full, half, quarter, and hourly minutes from the explicit work schedule", async () => {
  const { store, service } = createHarness();
  await grant(service, { minutes: 960 });
  const base = {
    employee_id: "emp-001",
    leave_type_id: "type-annual",
    policy_version_id: "policy-2026-v1",
    start_date: "2026-07-14",
    end_date: "2026-07-14",
  };
  const fullDay = await service.preview({ tenant_id: TENANT }, { ...base, duration_mode: "full_day" });
  assert.equal(fullDay.schedule.requested_minutes, 480);
  assert.deepEqual(fullDay.schedule.segments[0].leave_periods, [
    { start: "09:00", end: "12:00", minutes: 180 },
    { start: "13:00", end: "18:00", minutes: 300 },
  ]);
  assert.equal(fullDay.approval_plan.approver_actor_id, "manager-001");
  assert.equal((await service.preview({ tenant_id: TENANT }, { ...base, duration_mode: "half_day" })).schedule.requested_minutes, 240);
  assert.equal((await service.preview({ tenant_id: TENANT }, { ...base, duration_mode: "quarter_day" })).schedule.requested_minutes, 120);
  assert.equal((await service.preview({ tenant_id: TENANT }, { ...base, duration_mode: "hours", requested_minutes: 90 })).schedule.requested_minutes, 90);
  await assert.rejects(
    service.preview({ tenant_id: TENANT }, { ...base, end_date: "2026-07-15", duration_mode: "half_day" }),
    (error) => error.safe_error_code === "HRX_LEAVE_PARTIAL_DAY_SINGLE_DATE_REQUIRED",
  );
  store.close();
});

test("special leave enforces minimal reason and owned evidence, then durably completes an additional-information request", async () => {
  const { store, service } = createHarness();
  await grant(service, { minutes: 960 });
  store.query("insert", {
    table: "hrx_leave_types",
    row: {
      tenant_id: TENANT,
      leave_type_id: "type-special",
      group_id: "group-paid",
      code: "SPECIAL",
      display_name: "특별휴가",
      request_unit: "minutes",
      evidence_rule_json: JSON.stringify({ reason_required: true, attachment_required: true, allowed_document_types: ["leave_evidence"] }),
      status: "active",
    },
  });
  store.query("insert", {
    table: "hrx_documents",
    row: {
      tenant_id: TENANT,
      document_id: "doc-leave-evidence-001",
      employee_id: "emp-001",
      document_type: "leave_evidence",
      source_ref: "DMS:leave-evidence-001",
      source_status: "verified",
      source_metadata_json: "{}",
      title: "특별휴가 증빙",
      document_body_included: false,
    },
  });
  const special = submitInput({
    leave_type_id: "type-special",
    request_id: "leave-special-001",
    idempotency_key: "submit-special-001",
  });
  await assert.rejects(
    service.submit({ tenant_id: TENANT, actor_id: "user-001" }, special),
    (error) => error.safe_error_code === "HRX_LEAVE_REASON_REQUIRED",
  );
  await assert.rejects(
    service.submit({ tenant_id: TENANT, actor_id: "user-001" }, { ...special, idempotency_key: "submit-special-002", reason_text: "가족 행사" }),
    (error) => error.safe_error_code === "HRX_LEAVE_ATTACHMENT_REQUIRED",
  );
  await assert.rejects(
    service.submit({ tenant_id: TENANT, actor_id: "user-001" }, { ...special, idempotency_key: "submit-special-003", reason_text: "가족 행사", document_ids: ["doc-missing"] }),
    (error) => error.safe_error_code === "HRX_LEAVE_EVIDENCE_DOCUMENT_DENIED",
  );
  const submitted = await service.submit(
    { tenant_id: TENANT, actor_id: "user-001" },
    { ...special, idempotency_key: "submit-special-004", reason_text: "가족 행사", handover_note: "담당 사건 인계 완료", document_ids: ["doc-leave-evidence-001"] },
  );
  assert.equal(submitted.leave_request.reason_text, "가족 행사");
  assert.equal(store.query("select", { table: "hrx_leave_request_attachments", where: { tenant_id: TENANT, request_id: "leave-special-001" } }).length, 1);

  const requested = await service.requestAdditionalInformation(
    { tenant_id: TENANT, actor_id: "manager-001" },
    {
      idempotency_key: "request-info-001",
      request_id: "leave-special-001",
      request_message: "행사 일정을 확인할 수 있는 설명을 보완해 주세요.",
      applicant_actor_ids: ["emp-001", "user-001"],
    },
  );
  assert.equal(requested.leave_request.information_requested_at, NOW);
  const provided = await service.provideAdditionalInformation(
    { tenant_id: TENANT, actor_id: "user-001" },
    {
      idempotency_key: "provide-info-001",
      request_id: "leave-special-001",
      reason_text: "가족 행사 일정 확정",
      applicant_actor_ids: ["emp-001", "user-001"],
    },
  );
  assert.equal(provided.leave_request.information_provided_at, NOW);
  assert.equal(provided.leave_request.state, "submitted");
  const informationOutbox = store.query("select", { table: "hrx_leave_sync_outbox", where: { tenant_id: TENANT, aggregate_id: "leave-special-001" } })
    .filter((event) => event.event_type.includes("additional_information"));
  assert.equal(informationOutbox.length, 2);
  assert.ok(informationOutbox.every((event) => !event.payload_json.includes("가족 행사")));
  store.close();
});

test("submitted leave dates can be amended by the applicant and cancellation closes approval and restores balance", async () => {
  const { store, service } = createHarness();
  await grant(service);
  await service.submit({ tenant_id: TENANT, actor_id: "user-001" }, submitInput());
  const amended = await service.amendSubmitted(
    { tenant_id: TENANT, actor_id: "user-001" },
    {
      idempotency_key: "amend-001",
      request_id: "leave-001",
      applicant_actor_ids: ["emp-001", "user-001"],
      start_date: "2026-07-15",
      end_date: "2026-07-15",
    },
  );
  assert.equal(amended.leave_request.start_date, "2026-07-15");
  const cancelled = await service.closeSubmitted(
    { tenant_id: TENANT, actor_id: "user-001" },
    {
      idempotency_key: "cancel-001",
      request_id: "leave-001",
      state: "cancelled",
      applicant_actor_ids: ["emp-001", "user-001"],
    },
  );
  assert.equal(cancelled.leave_request.state, "cancelled");
  const approval = store.query("selectOne", { table: "hrx_approval_requests", where: { tenant_id: TENANT, object_id: "leave-001" } });
  assert.equal(approval.state, "cancelled");
  assert.equal(createSqlLeaveBalanceLedger({ store }).balance({ tenant_id: TENANT, employee_id: "emp-001", group_id: "group-paid" }).available_minutes, 480);
  store.close();
});

test("assigned manager proposes alternate dates, applicant accepts, and manager approves the revised request", async () => {
  const { store, service } = createHarness();
  await grant(service);
  await service.submit({ tenant_id: TENANT, actor_id: "user-001" }, submitInput());
  const proposed = await service.proposeReschedule(
    { tenant_id: TENANT, actor_id: "manager-001" },
    {
      idempotency_key: "reschedule-propose-001",
      request_id: "leave-001",
      applicant_actor_ids: ["emp-001", "user-001"],
      proposed_start_date: "2026-07-15",
      proposed_end_date: "2026-07-15",
      legal_reason: "업무 운영에 중대한 지장이 예상되어 대체 일정을 협의합니다.",
      expires_at: "2026-07-14T01:00:00.000Z",
    },
  );
  assert.equal(proposed.proposal.state, "proposed");
  assert.equal(proposed.leave_request.state, "reschedule_pending");
  const accepted = await service.respondToReschedule(
    { tenant_id: TENANT, actor_id: "user-001" },
    {
      idempotency_key: "reschedule-response-001",
      request_id: "leave-001",
      proposal_id: proposed.proposal.proposal_id,
      decision: "accept",
      applicant_actor_ids: ["emp-001", "user-001"],
    },
  );
  assert.equal(accepted.leave_request.start_date, "2026-07-15");
  assert.equal(accepted.leave_request.state, "submitted");
  assert.equal(accepted.proposal.state, "accepted");
  assert.deepEqual(
    [...new Set(store.query("select", {
      table: "hrx_leave_request_allocations",
      where: { tenant_id: TENANT, request_id: "leave-001", allocation_phase: "reserved" },
    }).map((row) => row.allocation_round))],
    [1, 2],
  );
  assert.equal(createSqlLeaveBalanceLedger({ store }).balance({ tenant_id: TENANT, employee_id: "emp-001", group_id: "group-paid" }).reserved_minutes, 480);
  const approved = await service.approve(
    { tenant_id: TENANT, actor_id: "manager-001" },
    {
      idempotency_key: "approve-after-reschedule-001",
      request_id: "leave-001",
      applicant_actor_ids: ["emp-001", "user-001"],
    },
  );
  assert.equal(approved.leave_request.state, "approved");
  store.close();
});

test("assigned manager rejection closes durable approval and releases the reservation", async () => {
  const { store, service } = createHarness();
  await grant(service);
  await service.submit({ tenant_id: TENANT, actor_id: "user-001" }, submitInput());
  const rejected = await service.closeSubmitted(
    { tenant_id: TENANT, actor_id: "manager-001" },
    {
      idempotency_key: "reject-001",
      request_id: "leave-001",
      state: "rejected",
      applicant_actor_ids: ["emp-001", "user-001"],
      decision_reason: "정책 범위 밖의 특별휴가 신청",
    },
  );
  assert.equal(rejected.leave_request.state, "rejected");
  const approval = store.query("selectOne", { table: "hrx_approval_requests", where: { tenant_id: TENANT, object_id: "leave-001" } });
  assert.equal(approval.state, "rejected");
  assert.equal(createSqlLeaveBalanceLedger({ store }).balance({ tenant_id: TENANT, employee_id: "emp-001", group_id: "group-paid" }).reserved_minutes, 0);
  store.close();
});

test("leave commands replay the first result and reject an idempotency key with different input", async () => {
  const { store, service } = createHarness();
  const first = await grant(service);
  const replay = await grant(service);
  assert.deepEqual(replay, first);
  assert.equal(store.query("select", { table: "hrx_leave_entitlements", where: { tenant_id: TENANT } }).length, 1);
  await assert.rejects(
    grant(service, { minutes: 960 }),
    (error) => error.safe_error_code === "HRX_LEAVE_IDEMPOTENCY_KEY_REUSED" && error.status === 409,
  );
  store.close();
});

test("concurrent leave submissions cannot reserve the same entitlement twice", async () => {
  let release;
  let waiting = 0;
  const gate = new Promise((resolve) => {
    release = resolve;
  });
  const { store, service } = createHarness({
    approverResolver: async () => {
      waiting += 1;
      if (waiting === 2) release();
      await gate;
      return {
        actor_id: "manager-001",
        source_assignment_version: "reporting-line-v1",
        valid_from: "2026-01-01T00:00:00.000Z",
      };
    },
  });
  await grant(service);
  const results = await Promise.allSettled([
    service.submit({ tenant_id: TENANT, actor_id: "user-001" }, submitInput()),
    service.submit(
      { tenant_id: TENANT, actor_id: "user-001" },
      submitInput({ idempotency_key: "submit-002", request_id: "leave-002", start_date: "2026-07-15", end_date: "2026-07-15" }),
    ),
  ]);
  assert.equal(results.filter((result) => result.status === "fulfilled").length, 1);
  assert.equal(results.filter((result) => result.status === "rejected").length, 1);
  assert.equal(results.find((result) => result.status === "rejected").reason.safe_error_code, "HRX_TRANSACTION_CONFLICT");
  assert.equal(
    createSqlLeaveBalanceLedger({ store }).balance({ tenant_id: TENANT, employee_id: "emp-001", group_id: "group-paid" }).reserved_minutes,
    480,
  );
  assert.equal(store.query("select", { table: "hrx_leave_requests", where: { tenant_id: TENANT } }).length, 1);
  store.close();
});

for (const stage of [
  "submit.after_request",
  "submit.after_segments",
  "submit.after_reservation",
  "submit.after_approval",
  "submit.after_audit",
  "submit.after_outbox",
  "submit.after_receipt",
]) {
  test(`submit rolls every durable mutation back when ${stage} fails`, async () => {
    const { store, service } = createHarness({
      failureInjector(currentStage) {
        if (currentStage === stage) throw new Error(`synthetic:${stage}`);
      },
    });
    await grant(service);
    await assert.rejects(
      service.submit({ tenant_id: TENANT, actor_id: "user-001" }, submitInput()),
      new RegExp(`synthetic:${stage.replaceAll(".", "\\.")}`),
    );
    for (const table of [
      "hrx_leave_requests",
      "hrx_leave_request_segments",
      "hrx_leave_request_allocations",
      "hrx_approval_requests",
      "hrx_approval_steps",
      "hrx_approval_assignments",
      "hrx_audit_events",
      "hrx_leave_sync_outbox",
    ]) {
      assert.equal(store.query("select", { table, where: { tenant_id: TENANT } }).length, 0, table);
    }
    assert.equal(
      store.query("select", { table: "hrx_leave_command_receipts", where: { tenant_id: TENANT, idempotency_key: "submit-001" } }).length,
      0,
    );
    assert.deepEqual(
      store.query("select", { table: "hrx_leave_balance_entries", where: { tenant_id: TENANT } }).map((row) => row.entry_type),
      ["earned"],
    );
    store.close();
  });
}

test("leave ledger is append-only and enforces CAS, tenant-scoped idempotency, and one-time reversal", async () => {
  const { store, service } = createHarness();
  await grant(service);
  const earned = store.query("selectOne", {
    table: "hrx_leave_balance_entries",
    where: { tenant_id: TENANT, entry_type: "earned" },
  });
  assert.throws(
    () => store.query("updateOne", { table: "hrx_leave_balance_entries", where: { tenant_id: TENANT, entry_id: earned.entry_id }, patch: { amount_minutes: 1 } }),
    /append-only/,
  );
  assert.throws(
    () => store.query("deleteOne", { table: "hrx_leave_balance_entries", where: { tenant_id: TENANT, entry_id: earned.entry_id } }),
    /append-only/,
  );
  assert.throws(
    () => store.query("updateOne", {
      table: "hrx_leave_entitlements",
      where: { tenant_id: TENANT, entitlement_id: "entitlement-001" },
      expected_version: 99,
      patch: { state_version: 2 },
    }),
    (error) => error.safe_error_code === "HRX_STATE_VERSION_CONFLICT",
  );
  const ledger = createSqlLeaveBalanceLedger({ store });
  ledger.append({
    tenant_id: TENANT,
    entry_id: "adjustment-debit-001",
    employee_id: "emp-001",
    policy_id: "annual-kr",
    policy_version_id: "policy-2026-v1",
    group_id: "group-paid",
    entitlement_id: "entitlement-001",
    idempotency_key: "adjustment-debit-001",
    entry_type: "adjustment",
    adjustment_direction: "debit",
    amount_minutes: 10,
    occurred_on: "2026-07-13",
    source_ref: "Adjustment:001",
  });
  ledger.append({
    tenant_id: TENANT,
    entry_id: "adjustment-credit-001",
    employee_id: "emp-001",
    policy_id: "annual-kr",
    policy_version_id: "policy-2026-v1",
    group_id: "group-paid",
    entitlement_id: "entitlement-001",
    idempotency_key: "adjustment-credit-001",
    entry_type: "adjustment",
    adjustment_direction: "credit",
    amount_minutes: 10,
    occurred_on: "2026-07-13",
    source_ref: "Adjustment:001",
    reverses_entry_id: "adjustment-debit-001",
  });
  assert.throws(
    () => ledger.append({
      tenant_id: TENANT,
      entry_id: "adjustment-credit-002",
      employee_id: "emp-001",
      policy_id: "annual-kr",
      policy_version_id: "policy-2026-v1",
      group_id: "group-paid",
      entitlement_id: "entitlement-001",
      idempotency_key: "adjustment-credit-002",
      entry_type: "adjustment",
      adjustment_direction: "credit",
      amount_minutes: 10,
      occurred_on: "2026-07-13",
      source_ref: "Adjustment:001",
      reverses_entry_id: "adjustment-debit-001",
    }),
    /unique constraint failed.*reverses_entry_id/,
  );
  store.close();
});

test("approved leave balance and approval state survive store restart", async () => {
  const filePath = join(mkdtempSync(join(tmpdir(), "hrx-leave-management-")), "store.json");
  const first = createHarness({ filePath });
  await grant(first.service);
  await first.service.submit({ tenant_id: TENANT, actor_id: "user-001" }, submitInput());
  await first.service.approve(
    { tenant_id: TENANT, actor_id: "manager-001" },
    { idempotency_key: "approve-001", request_id: "leave-001", applicant_actor_ids: ["user-001"] },
  );
  first.store.close();

  const reopened = createFileHrxStore({ filePath });
  runHrxMigrations(reopened);
  assert.equal(
    reopened.query("selectOne", { table: "hrx_leave_requests", where: { tenant_id: TENANT, request_id: "leave-001" } }).state,
    "approved",
  );
  assert.equal(
    createSqlLeaveBalanceLedger({ store: reopened }).balance({ tenant_id: TENANT, employee_id: "emp-001", group_id: "group-paid" }).used_minutes,
    480,
  );
  assert.equal(
    reopened.query("selectOne", { table: "hrx_approval_requests", where: { tenant_id: TENANT, object_id: "leave-001" } }).state,
    "approved",
  );
  reopened.close();
});
