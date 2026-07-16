import assert from "node:assert/strict";
import test from "node:test";
import { createHrxRuntimeContext, handleHrxApiRequest, seedHrxDurableRuntimeStore } from "../../src/hrx-runtime-context.js";
import { MATTER_VAULT_REGISTERED_TENANT_ID } from "../../src/matter-vault-account-registry.js";
import { resolveHrxRoutePolicy } from "../../src/routes/hrx/route-policy-map.js";
import { runHrxMigrations } from "../../../../packages/hrx/src/migrations/index.js";
import { createFileHrxStore } from "../../../../packages/hrx/src/store/file-store.js";

const TENANT = MATTER_VAULT_REGISTERED_TENANT_ID;
const EMPLOYEE = "emp_amic_yjlee";
const STAFF = "user_amic_yjlee";
const MANAGER = "user_amic_tryoon";

function setup() {
  const store = createFileHrxStore();
  runHrxMigrations(store);
  seedHrxDurableRuntimeStore(store);
  store.query("insert", { table: "hrx_leave_groups", row: { tenant_id: TENANT, group_id: "integration-group", code: "INTEGRATION_PAID", display_name: "유급 휴가", status: "active", state_version: 1 } });
  store.query("insert", { table: "hrx_leave_types", row: { tenant_id: TENANT, leave_type_id: "integration-annual", group_id: "integration-group", code: "ANNUAL", display_name: "연차", request_unit: "minutes", evidence_rule_json: "{}", status: "active" } });
  store.query("insert", { table: "hrx_leave_policy_versions", row: { tenant_id: TENANT, policy_version_id: "integration-policy-v1", group_id: "integration-group", policy_code: "INTEGRATION-2026", version: 1, effective_from: "2026-01-01", effective_to: null, status: "active", rules_json: JSON.stringify({ type_rules: { "integration-annual": { paid_ratio_bps: 2_500, deduction_ratio_bps: 10_000 } } }) } });
  store.query("insert", { table: "hrx_work_schedule_profiles", row: { tenant_id: TENANT, schedule_profile_id: "integration-schedule", display_name: "서울 표준 근무", timezone: "Asia/Seoul", weekly_schedule_json: JSON.stringify({ 1: [{ start: "09:00", end: "12:00" }, { start: "13:00", end: "18:00" }], 2: [{ start: "09:00", end: "12:00" }, { start: "13:00", end: "18:00" }], 3: [{ start: "09:00", end: "12:00" }, { start: "13:00", end: "18:00" }], 4: [{ start: "09:00", end: "12:00" }, { start: "13:00", end: "18:00" }], 5: [{ start: "09:00", end: "12:00" }, { start: "13:00", end: "18:00" }] }), holiday_calendar_ref: "KR_PUBLIC_HOLIDAYS", effective_from: "2026-01-01", effective_to: null, state_version: 1 } });
  store.query("insert", { table: "hrx_work_schedule_assignments", row: { tenant_id: TENANT, schedule_assignment_id: "integration-schedule-assignment", schedule_profile_id: "integration-schedule", employee_id: EMPLOYEE, organization_id: null, priority: 100, effective_from: "2026-01-01", effective_to: null } });
  return { store, context: createHrxRuntimeContext({ store }) };
}

function actor(actorId, scopes) {
  return { tenant_id: TENANT, actor_id: actorId, actor_role: "synthetic_test", hrx_scopes: scopes, session_bound: true };
}

function request(context, pathname, method, body, requestContext) {
  return handleHrxApiRequest({ pathname, method, body: body ?? {}, query: {}, context, requestContext });
}

test("LV-07 integration routes use report-read and policy-write scopes", () => {
  assert.equal(resolveHrxRoutePolicy({ method: "GET", pathname: "/api/hrx/leave/integrations" }).required_scope, "hrx.leave.report.export");
  assert.equal(resolveHrxRoutePolicy({ method: "GET", pathname: "/api/hrx/leave/integrations" }).action, "hrx.leave.integration.read");
  assert.equal(resolveHrxRoutePolicy({ method: "POST", pathname: "/api/hrx/leave/integrations/process" }).required_scope, "hrx.leave.policy.write");
  assert.equal(resolveHrxRoutePolicy({ method: "POST", pathname: "/api/hrx/leave/integrations/process" }).action, "hrx.leave.integration.process");
  assert.equal(resolveHrxRoutePolicy({ method: "POST", pathname: "/api/hrx/leave/integrations/dead-letters/dead-001/retry" }).required_scope, "hrx.leave.policy.write");
  assert.equal(resolveHrxRoutePolicy({ method: "POST", pathname: "/api/hrx/leave/integrations/dead-letters/dead-001/retry" }).action, "hrx.leave.integration.dead_letter.requeue");
});

test("LV-07 API projects an approved leave to four receipt-backed boundaries", async () => {
  const { store, context } = setup();
  await context.leaveManagementService.grantEntitlement({ tenant_id: TENANT, actor_id: "hr-operator" }, { idempotency_key: "integration-grant", entitlement_id: "integration-entitlement", employee_id: EMPLOYEE, group_id: "integration-group", policy_version_id: "integration-policy-v1", granted_minutes: 960, valid_from: "2026-01-01", expires_on: "2026-12-31", source_ref: "LeaveAccrualRun:LV07" });
  const staff = actor(STAFF, ["hrx.leave.self.read", "hrx.leave.self.write"]);
  const manager = actor(MANAGER, ["hrx.leave.team.read", "hrx.leave.approve"]);
  const hr = actor("user_amic_jwsuh", ["hrx.leave.report.export", "hrx.leave.policy.write"]);
  const submitted = await request(context, "/api/hrx/leave/me/requests", "POST", { idempotency_key: "integration-submit", request_id: "integration-request", leave_type_id: "integration-annual", policy_version_id: "integration-policy-v1", requested_minutes: 240, start_date: "2026-07-14", end_date: "2026-07-14", reason_text: "비공개 사유" }, staff);
  assert.equal(submitted.status, 201, JSON.stringify(submitted.body));
  const approved = await request(context, "/api/hrx/leave/requests/integration-request/approve", "POST", { idempotency_key: "integration-approve" }, manager);
  assert.equal(approved.status, 200, JSON.stringify(approved.body));

  const status = await request(context, "/api/hrx/leave/integrations", "GET", {}, hr);
  assert.equal(status.status, 200, JSON.stringify(status.body));
  const approvedRow = status.body.integration.rows.find((row) => row.event_type === "leave.request.approved");
  assert.equal(approvedRow.state, "delivered");
  assert.deepEqual(approvedRow.deliveries.map((row) => row.provider_kind).sort(), ["attendance", "notification", "payroll", "schedule"]);
  assert.ok(approvedRow.deliveries.every((row) => row.state === "delivered" && /^(InternalLeaveProjection|MatterCalendarReceipt):/.test(row.provider_receipt_ref)));
  assert.equal(approvedRow.deliveries.find((row) => row.provider_kind === "schedule").payload.public_title, "휴가");
  assert.equal(approvedRow.deliveries.find((row) => row.provider_kind === "schedule").payload.owner_ref, `HRXEmployee:${EMPLOYEE}`);
  assert.doesNotMatch(JSON.stringify(approvedRow.deliveries.find((row) => row.provider_kind === "schedule").payload), /"(employee_id|leave_type|leave_type_id|reason|reason_text|attachment_id|attachment_ids|document_id|document_ids)":/);
  assert.equal(approvedRow.deliveries.find((row) => row.provider_kind === "attendance").payload.days[0].unexcused_absence_minutes, 0);
  const payroll = approvedRow.deliveries.find((row) => row.provider_kind === "payroll").payload;
  assert.equal(payroll.paid_minutes, 60);
  assert.equal(payroll.unpaid_minutes, 180);
  assert.equal(payroll.paid_minutes + payroll.unpaid_minutes, 240);
  assert.equal(payroll.policy_snapshot_ref.policy_version_id, "integration-policy-v1");
  assert.match(payroll.policy_snapshot_ref.policy_rules_snapshot_hash, /^[a-f0-9]{64}$/);
  assert.doesNotMatch(JSON.stringify(payroll), /비공개 사유|reason_text|display_name|document_ids|attachment_ids/);
  assert.doesNotMatch(JSON.stringify(approvedRow.deliveries.find((row) => row.provider_kind === "notification").payload), /비공개 사유|employee_id|reason_text/);

  const processed = await request(context, "/api/hrx/leave/integrations/process", "POST", { limit: 50 }, hr);
  assert.equal(processed.status, 200);
  assert.equal(processed.body.integration.processed_count, 0);
  store.close();
});

test("LV-07 integration status and counts fail closed for staff", async () => {
  const { store, context } = setup();
  const staff = actor(STAFF, ["hrx.leave.self.read", "hrx.leave.self.write"]);
  const read = await request(context, "/api/hrx/leave/integrations", "GET", {}, staff);
  assert.equal(read.status, 403);
  assert.equal(read.body.count_leak_prevented, true);
  assert.equal("integration" in read.body, false);
  const process = await request(context, "/api/hrx/leave/integrations/process", "POST", {}, staff);
  assert.equal(process.status, 403);
  assert.equal(process.body.count_leak_prevented, true);
  const retry = await request(context, "/api/hrx/leave/integrations/dead-letters/dead-001/retry", "POST", {}, staff);
  assert.equal(retry.status, 403);
  assert.equal(retry.body.count_leak_prevented, true);
  store.close();
});

test("LV-INT-005 API requeues one open dead letter without exposing event payloads", async () => {
  const { store, context } = setup();
  store.query("insert", { table: "hrx_leave_sync_outbox", row: {
    tenant_id: TENANT,
    outbox_event_id: "dead-letter-outbox",
    aggregate_type: "LeaveRequest",
    aggregate_id: "dead-letter-request",
    event_type: "leave.request.submitted",
    payload_json: "{}",
    idempotency_key: "dead-letter-outbox",
    state: "pending_sync",
    attempt_count: 3,
    available_at: "2026-07-14T00:00:00.000Z",
    delivered_at: null,
    provider_receipt_ref: null,
    last_error_code: "SYNTHETIC_POISON",
    created_at: "2026-07-14T00:00:00.000Z",
    updated_at: "2026-07-14T00:00:00.000Z",
  } });
  store.query("insert", { table: "hrx_leave_integration_deliveries", row: {
    tenant_id: TENANT,
    delivery_id: "dead-letter-delivery",
    outbox_event_id: "dead-letter-outbox",
    provider_kind: "notification",
    provider_mode: "synthetic_poison",
    event_type: "leave.request.submitted",
    state: "failed",
    payload_hash: "a".repeat(64),
    payload_json: JSON.stringify({ event_code: "leave.request.submitted", title: "휴가 신청 상태", recipient_token: "recipient-token", route: "people-leave-requests", private_fields_included: false, requested_dates_included: false }),
    idempotency_key: "dead-letter-delivery",
    attempt_count: 3,
    last_error_code: "SYNTHETIC_POISON",
    provider_receipt_ref: null,
    delivered_at: null,
    created_at: "2026-07-14T00:00:00.000Z",
    updated_at: "2026-07-14T00:00:00.000Z",
  } });
  store.query("insert", { table: "hrx_leave_integration_dead_letters", row: {
    tenant_id: TENANT,
    dead_letter_id: "dead-letter-001",
    outbox_event_id: "dead-letter-outbox",
    delivery_id: "dead-letter-delivery",
    provider_kind: "notification",
    state: "open",
    fail_count: 3,
    last_error_code: "SYNTHETIC_POISON",
    idempotency_key: "dead-letter-001",
    created_at: "2026-07-14T00:00:00.000Z",
    requeued_at: null,
    requeued_by_actor_id: null,
    resolved_at: null,
    updated_at: "2026-07-14T00:00:00.000Z",
  } });
  const hr = actor("user_amic_jwsuh", ["hrx.leave.report.export", "hrx.leave.policy.write"]);
  const response = await request(context, "/api/hrx/leave/integrations/dead-letters/dead-letter-001/retry", "POST", {}, hr);
  assert.equal(response.status, 200, JSON.stringify(response.body));
  assert.equal(response.body.outcome, "requeued");
  assert.equal(response.body.dead_letter.state, "requeued");
  assert.equal(response.body.integration.summary.dead_lettered, 0);
  assert.equal("payload_json" in response.body.integration.rows.find((row) => row.outbox_event_id === "dead-letter-outbox"), false);
  store.close();
});
