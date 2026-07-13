import assert from "node:assert/strict";
import test from "node:test";
import {
  createHrxRuntimeContext,
  handleHrxApiRequest,
  seedHrxDurableRuntimeStore,
} from "../../src/hrx-runtime-context.js";
import { MATTER_VAULT_REGISTERED_TENANT_ID } from "../../src/matter-vault-account-registry.js";
import { resolveHrxRoutePolicy } from "../../src/routes/hrx/route-policy-map.js";
import { runHrxMigrations } from "../../../../packages/hrx/src/migrations/index.js";
import { createFileHrxStore } from "../../../../packages/hrx/src/store/file-store.js";

const TENANT = MATTER_VAULT_REGISTERED_TENANT_ID;
const EMPLOYEE_ID = "emp_amic_yjlee";
const STAFF_ACTOR = "user_amic_yjlee";
const MANAGER_ACTOR = "user_amic_tryoon";

function setup() {
  const store = createFileHrxStore();
  runHrxMigrations(store);
  seedHrxDurableRuntimeStore(store);
  store.query("insert", {
    table: "hrx_leave_groups",
    row: { tenant_id: TENANT, group_id: "group-paid", code: "PAID", display_name: "유급 휴가", status: "active", state_version: 1 },
  });
  store.query("insert", {
    table: "hrx_leave_types",
    row: { tenant_id: TENANT, leave_type_id: "type-annual", group_id: "group-paid", code: "ANNUAL", display_name: "연차", request_unit: "minutes", evidence_rule_json: "{}", status: "active" },
  });
  store.query("insert", {
    table: "hrx_leave_policy_versions",
    row: { tenant_id: TENANT, policy_version_id: "policy-v1", group_id: "group-paid", policy_code: "annual-kr", version: 1, effective_from: "2026-01-01", effective_to: null, status: "active", rules_json: "{}" },
  });
  store.query("insert", {
    table: "hrx_work_schedule_profiles",
    row: {
      tenant_id: TENANT,
      schedule_profile_id: "schedule-480",
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
    row: { tenant_id: TENANT, schedule_assignment_id: "schedule-assignment-yjlee", schedule_profile_id: "schedule-480", employee_id: EMPLOYEE_ID, organization_id: null, priority: 100, effective_from: "2026-01-01", effective_to: null },
  });
  store.query("insert", {
    table: "hrx_documents",
    row: {
      tenant_id: TENANT,
      document_id: "doc-yjlee-leave-evidence",
      employee_id: EMPLOYEE_ID,
      document_type: "leave_evidence",
      source_ref: "DMS:synthetic-yjlee-leave-evidence",
      source_status: "verified",
      source_metadata_json: "{}",
      title: "합성 휴가 증빙",
      document_body_included: false,
    },
  });
  const context = createHrxRuntimeContext({ store });
  return { store, context };
}

function actor(actorId, scopes) {
  return { tenant_id: TENANT, actor_id: actorId, actor_role: "synthetic_test", hrx_scopes: scopes, session_bound: true };
}

async function request(context, pathname, method, body, requestContext) {
  return handleHrxApiRequest({ pathname, method, body: body ?? {}, query: {}, context, requestContext });
}

test("signed /me workflow ignores forged employee ids, reserves balance, and exposes only assigned manager approval", async () => {
  const { store, context } = setup();
  await context.leaveManagementService.grantEntitlement(
    { tenant_id: TENANT, actor_id: MANAGER_ACTOR },
    {
      idempotency_key: "grant-api-001",
      entitlement_id: "entitlement-api-001",
      employee_id: EMPLOYEE_ID,
      group_id: "group-paid",
      policy_version_id: "policy-v1",
      granted_minutes: 960,
      valid_from: "2026-01-01",
      expires_on: "2026-12-31",
      source_ref: "SyntheticAccrual:2026",
    },
  );
  const staff = actor(STAFF_ACTOR, ["hrx.leave.self.read", "hrx.leave.self.write"]);
  const manager = actor(MANAGER_ACTOR, ["hrx.leave.team.read", "hrx.leave.approve"]);
  const preview = await request(context, "/api/hrx/leave/me/preview", "POST", {
    employee_id: "emp-forged",
    leave_type_id: "type-annual",
    policy_version_id: "policy-v1",
    start_date: "2026-07-14",
    end_date: "2026-07-14",
    duration_mode: "full_day",
  }, staff);
  assert.equal(preview.status, 200);
  assert.equal(preview.body.preview.employee_id, EMPLOYEE_ID);
  assert.equal(preview.body.preview.schedule.requested_minutes, 480);
  assert.equal(preview.body.preview.approval_plan.approver.display_name, "윤태리");
  const evidenceDocuments = await request(context, "/api/hrx/leave/me/evidence-documents", "GET", {}, staff);
  assert.equal(evidenceDocuments.status, 200);
  assert.ok(evidenceDocuments.body.documents.some((document) => document.document_id === "doc-yjlee-leave-evidence"));
  assert.ok(evidenceDocuments.body.documents.every((document) => !document.source_ref && !document.source_metadata_json));

  const submitted = await request(context, "/api/hrx/leave/me/requests", "POST", {
    idempotency_key: "submit-api-001",
    request_id: "leave-api-001",
    employee_id: "emp-forged",
    leave_type_id: "type-annual",
    policy_version_id: "policy-v1",
    requested_minutes: 480,
    duration_mode: "full_day",
    start_date: "2026-07-14",
    end_date: "2026-07-14",
  }, staff);
  assert.equal(submitted.status, 201);
  assert.equal(submitted.body.leave_request.employee_id, EMPLOYEE_ID);
  const snapshot = await request(context, "/api/hrx/leave/me", "GET", {}, staff);
  assert.equal(snapshot.body.balances[0].balance.reserved_minutes, 480);

  const queue = await request(context, "/api/hrx/leave/requests", "GET", {}, manager);
  assert.equal(queue.status, 200, JSON.stringify(queue.body));
  assert.equal(queue.body.approvals.length, 1);
  assert.equal(queue.body.approvals[0].assignment.approver_actor_id, MANAGER_ACTOR);
  const unrelated = await request(context, "/api/hrx/leave/requests", "GET", {}, actor("user_amic_jwsuh", ["hrx.leave.team.read", "hrx.leave.approve"]));
  assert.deepEqual(unrelated.body.approvals, []);

  const escalated = await request(context, "/api/hrx/leave/requests/leave-api-001/escalate", "POST", {
    idempotency_key: "escalate-api-001",
    substitute_actor_id: "user_amic_jwsuh",
    due_at: "2026-01-01T00:00:00.000Z",
  }, actor("user_amic_ytkim", ["hrx.leave.policy.write"]));
  assert.equal(escalated.status, 201);
  const substituteQueue = await request(context, "/api/hrx/leave/requests", "GET", {}, actor("user_amic_jwsuh", ["hrx.leave.team.read", "hrx.leave.approve"]));
  assert.equal(substituteQueue.body.approvals[0].escalated, true);

  const approved = await request(context, "/api/hrx/leave/requests/leave-api-001/approve", "POST", {
    idempotency_key: "approve-api-001",
    decision_reason: "업무 인계 확인",
  }, manager);
  assert.equal(approved.status, 200, JSON.stringify(approved.body));
  assert.equal(approved.body.leave_request.state, "approved");
  const approvedSnapshot = await request(context, "/api/hrx/leave/me", "GET", {}, staff);
  assert.equal(approvedSnapshot.body.balances[0].balance.used_minutes, 480);
  assert.equal(approvedSnapshot.body.balances[0].balance.reserved_minutes, 0);
  const team = await request(context, "/api/hrx/leave/team", "GET", {}, manager);
  assert.equal(team.status, 200);
  assert.deepEqual(team.body.absences[0], {
    employee_id: EMPLOYEE_ID,
    employee_display_name: "이예진",
    start_date: "2026-07-14",
    end_date: "2026-07-14",
    absence_label: "휴가",
  });
  assert.equal(team.body.privacy_boundary, "team_calendar_excludes_leave_type_reason_and_attachments");
  const deniedTeam = await request(context, "/api/hrx/leave/team", "GET", {}, staff);
  assert.equal(deniedTeam.status, 403);
  store.close();
});

test("granular leave routes bind self, team approval, and delegation scopes", () => {
  assert.equal(resolveHrxRoutePolicy({ method: "GET", pathname: "/api/hrx/leave/me" }).required_scope, "hrx.leave.self.read");
  assert.equal(resolveHrxRoutePolicy({ method: "POST", pathname: "/api/hrx/leave/me/requests" }).required_scope, "hrx.leave.self.write");
  assert.equal(resolveHrxRoutePolicy({ method: "GET", pathname: "/api/hrx/leave/me/evidence-documents" }).required_scope, "hrx.leave.self.read");
  assert.equal(resolveHrxRoutePolicy({ method: "POST", pathname: "/api/hrx/leave/me/requests/leave-1/additional-information" }).required_scope, "hrx.leave.self.write");
  assert.equal(resolveHrxRoutePolicy({ method: "POST", pathname: "/api/hrx/leave/requests/leave-1/approve" }).required_scope, "hrx.leave.approve");
  assert.equal(resolveHrxRoutePolicy({ method: "POST", pathname: "/api/hrx/leave/requests/leave-1/request-info" }).required_scope, "hrx.leave.approve");
  assert.equal(resolveHrxRoutePolicy({ method: "GET", pathname: "/api/hrx/leave/team" }).required_scope, "hrx.leave.team.read");
  assert.equal(resolveHrxRoutePolicy({ method: "POST", pathname: "/api/hrx/leave/requests/leave-1/escalate" }).required_scope, "hrx.leave.policy.write");
  assert.equal(resolveHrxRoutePolicy({ method: "POST", pathname: "/api/hrx/leave/delegations" }).required_scope, "hrx.leave.approve");
  assert.equal(resolveHrxRoutePolicy({ method: "GET", pathname: "/api/hrx/leave/delegations/candidates" }).required_scope, "hrx.leave.approve");
});

test("delegation API exposes eligible registered approvers and rejects unknown recipients", async () => {
  const { store, context } = setup();
  const manager = actor(MANAGER_ACTOR, ["hrx.leave.team.read", "hrx.leave.approve"]);
  const candidates = await request(context, "/api/hrx/leave/delegations/candidates", "GET", {}, manager);
  assert.equal(candidates.status, 200);
  assert.ok(candidates.body.candidates.some((candidate) => candidate.actor_id === "user_amic_jwsuh" && candidate.display_name));
  assert.ok(candidates.body.candidates.every((candidate) => candidate.actor_id !== MANAGER_ACTOR && !candidate.email));

  const blocked = await request(context, "/api/hrx/leave/delegations", "POST", {
    delegate_actor_id: "user_unknown",
    valid_from: "2026-07-14T00:00:00.000Z",
    valid_to: "2026-07-15T00:00:00.000Z",
  }, manager);
  assert.equal(blocked.status, 400);
  assert.equal(blocked.body.safe_error_code, "HRX_LEAVE_DELEGATE_NOT_ELIGIBLE");

  const created = await request(context, "/api/hrx/leave/delegations", "POST", {
    delegation_id: "leave-delegation-api-001",
    delegate_actor_id: "user_amic_jwsuh",
    valid_from: "2026-07-14T00:00:00.000Z",
    valid_to: "2026-07-15T00:00:00.000Z",
  }, manager);
  assert.equal(created.status, 201);
  assert.equal(created.body.delegation.delegate.display_name, "서지원");
  assert.equal(created.body.delegation.delegate.email, undefined);
  store.close();
});
