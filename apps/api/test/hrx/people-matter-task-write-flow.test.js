import assert from "node:assert/strict";
import test from "node:test";
import { createHrxAuditEventStore } from "../../../../packages/audit/src/hrx-event-store.js";
import { createInMemoryHrxRepository } from "../../../../packages/hrx/src/repository.js";
import { createMatterRepository } from "../../../../packages/matter/src/repository.js";
import {
  MATTER_RUNTIME_SYNTHETIC_TENANT_ID,
  createMatterRuntimeContext,
  handleMatterApiRequest,
} from "../../src/matter-runtime-context.js";
import { handleHrxApiRequest } from "../../src/hrx-runtime-context.js";

const TENANT = "tenant-people-task-write-flow";
const MATTER_ID = "matter-people-task-write-flow";
const EMPLOYEE_ID = "emp-assignee";
const USER_ID = "user-assignee";
const OTHER_EMPLOYEE_ID = "emp-other-assignee";
const OTHER_USER_ID = "user-other-assignee";
const EXPIRED_EMPLOYEE_ID = "emp-expired-assignee";
const EXPIRED_USER_ID = "user-expired-assignee";
const FUTURE_EMPLOYEE_ID = "emp-future-assignee";
const FUTURE_USER_ID = "user-future-assignee";
const AS_OF = "2026-07-31T00:30:00.000Z";
const LOGIN_MAPPINGS = Object.freeze([
  {
    tenant_id: TENANT,
    link_id: "link-assignee",
    employee_id: EMPLOYEE_ID,
    user_id: USER_ID,
    purpose: "login_mapping",
  },
  {
    tenant_id: TENANT,
    link_id: "link-other-assignee",
    employee_id: OTHER_EMPLOYEE_ID,
    user_id: OTHER_USER_ID,
    purpose: "login_mapping",
  },
  {
    tenant_id: TENANT,
    link_id: "link-expired-assignee",
    employee_id: EXPIRED_EMPLOYEE_ID,
    user_id: EXPIRED_USER_ID,
    purpose: "login_mapping",
  },
  {
    tenant_id: TENANT,
    link_id: "link-future-assignee",
    employee_id: FUTURE_EMPLOYEE_ID,
    user_id: FUTURE_USER_ID,
    purpose: "login_mapping",
  },
  {
    tenant_id: TENANT,
    link_id: "link-no-team",
    employee_id: "emp-no-team",
    user_id: "user-no-team",
    purpose: "login_mapping",
  },
  {
    tenant_id: TENANT,
    link_id: "link-revoked",
    employee_id: "emp-revoked",
    user_id: "user-revoked",
    purpose: "login_mapping",
    revoked_at: "2026-07-30T00:00:00.000Z",
  },
  {
    tenant_id: TENANT,
    link_id: "link-dangling",
    employee_id: "emp-dangling",
    user_id: "user-dangling",
    purpose: "login_mapping",
  },
  {
    tenant_id: TENANT,
    link_id: "link-inactive",
    employee_id: "emp-inactive",
    user_id: "user-inactive",
    purpose: "login_mapping",
  },
  {
    tenant_id: TENANT,
    link_id: "link-wrong-purpose",
    employee_id: "emp-wrong-purpose",
    user_id: "user-wrong-purpose",
    purpose: "directory_reference",
  },
  {
    tenant_id: TENANT,
    link_id: "link-ambiguous-a",
    employee_id: "emp-ambiguous",
    user_id: "user-ambiguous-a",
    purpose: "login_mapping",
  },
  {
    tenant_id: TENANT,
    link_id: "link-ambiguous-b",
    employee_id: "emp-ambiguous",
    user_id: "user-ambiguous-b",
    purpose: "login_mapping",
  },
  {
    tenant_id: "tenant-other",
    link_id: "link-cross-tenant",
    employee_id: "emp-cross-tenant",
    user_id: "user-cross-tenant",
    purpose: "login_mapping",
  },
]);
const USER_DIRECTORY = Object.freeze([
  USER_ID,
  OTHER_USER_ID,
  EXPIRED_USER_ID,
  FUTURE_USER_ID,
  "user-no-team",
  "user-revoked",
  "user-inactive",
  "user-wrong-purpose",
  "user-ambiguous-a",
  "user-ambiguous-b",
].map((user_id) => Object.freeze({
  tenant_id: TENANT,
  user_id,
  status: "active",
})).concat(Object.freeze({
  tenant_id: "tenant-other",
  user_id: "user-cross-tenant",
  status: "active",
})));

function matterPermissionContext() {
  return {
    principal: {
      user_id: "user-creator",
      tenant_id: TENANT,
      role_ids: ["attorney"],
    },
    rules: [{ id: "allow-matter", effect: "allow", action: "*" }],
    object_acl: [],
  };
}

function peoplePermissionContext(userId = USER_ID) {
  return {
    principal: {
      user_id: userId,
      tenant_id: TENANT,
      role_ids: ["attorney"],
    },
    rules: [
      { id: "allow-employee", effect: "allow", action: "hrx.employee.read" },
      { id: "allow-matter", effect: "allow", action: "matter:read" },
    ],
    object_acl: [],
  };
}

function createPeopleRepository() {
  return createInMemoryHrxRepository({
    employees: [{
      tenant_id: TENANT,
      employee_id: EMPLOYEE_ID,
      display_name: "김변호사",
      status: "active",
    }, {
      tenant_id: TENANT,
      employee_id: OTHER_EMPLOYEE_ID,
      display_name: "이변호사",
      status: "active",
    }, {
      tenant_id: TENANT,
      employee_id: EXPIRED_EMPLOYEE_ID,
      display_name: "만료된 담당자",
      status: "active",
    }, {
      tenant_id: TENANT,
      employee_id: FUTURE_EMPLOYEE_ID,
      display_name: "예약된 담당자",
      status: "active",
    }, {
      tenant_id: TENANT,
      employee_id: "emp-no-team",
      display_name: "미배정 변호사",
      status: "active",
    }, {
      tenant_id: TENANT,
      employee_id: "emp-revoked",
      display_name: "연결 해제 구성원",
      status: "active",
    }, {
      tenant_id: TENANT,
      employee_id: "emp-dangling",
      display_name: "계정 없는 구성원",
      status: "active",
    }, {
      tenant_id: TENANT,
      employee_id: "emp-inactive",
      display_name: "비활성 구성원",
      status: "inactive",
    }, {
      tenant_id: TENANT,
      employee_id: "emp-wrong-purpose",
      display_name: "로그인 연결 아닌 구성원",
      status: "active",
    }, {
      tenant_id: TENANT,
      employee_id: "emp-ambiguous",
      display_name: "계정 연결 중복 구성원",
      status: "active",
    }, {
      tenant_id: "tenant-other",
      employee_id: "emp-cross-tenant",
      display_name: "다른 테넌트 구성원",
      status: "active",
    }],
    employee_user_links: LOGIN_MAPPINGS.filter((link) => (
      !link.revoked_at && link.tenant_id === TENANT && link.purpose === "login_mapping"
    )),
  });
}

function peopleRuntimeContext(repository = createPeopleRepository()) {
  return {
    repository,
    audit: createHrxAuditEventStore(),
    clock: () => AS_OF,
    peopleTimezone: "Asia/Seoul",
    peopleFeatureFlags: {
      people_overview: false,
      people_member_brief: true,
      outlook_calendar: false,
      people_capacity: false,
    },
  };
}

test("HRX identity source never falls back to a synthetic login mapping", () => {
  const runtime = createMatterRuntimeContext({
    hrxRuntime: {
      repository: createInMemoryHrxRepository(),
      onboardingPlans: [],
    },
    repository: createMatterRepository({
      seedRecords: [{
        model_type: "MatterMember",
        tenant_id: MATTER_RUNTIME_SYNTHETIC_TENANT_ID,
        matter_id: "matter-no-fallback",
        member_id: "member-no-fallback",
        employee_id: "emp-001",
        user_id: "user_rp05_owner",
        role: "responsible_attorney",
        status: "active",
        valid_from: "2026-07-01T00:00:00.000Z",
        identity_resolution_state: "resolved",
      }],
    }),
  });

  assert.deepEqual(runtime.peopleAssignmentAuthority.resolveTaskAssignee({
    tenant_id: MATTER_RUNTIME_SYNTHETIC_TENANT_ID,
    matter_id: "matter-no-fallback",
    user_id: "user_rp05_owner",
    as_of: AS_OF,
  }), {
    state: "unresolved",
    reason: "unresolved_missing",
  });
  assert.deepEqual(runtime.peopleAssignmentAuthority.resolveEmployeeUserPair({
    tenant_id: MATTER_RUNTIME_SYNTHETIC_TENANT_ID,
    employee_id: "emp-001",
  }), {
    state: "unresolved",
    reason: "employee_missing",
  });
});

test("Matter 업무 생성에서 저장된 assigned_to_user_id를 People 오늘 할 일이 읽는다", async () => {
  const peopleRepository = createPeopleRepository();
  let authorityNow = AS_OF;
  const matterRuntime = createMatterRuntimeContext({
    hrxRuntime: {
      repository: peopleRepository,
      onboardingPlans: [],
    },
    employeeUserLinkDirectory: LOGIN_MAPPINGS,
    userDirectory: USER_DIRECTORY,
    clock: () => authorityNow,
    repository: createMatterRepository({
      seedRecords: [
        {
          model_type: "Matter",
          tenant_id: TENANT,
          matter_id: MATTER_ID,
          client_id: "client-people-task-write-flow",
          title: "민사 본안",
          matter_code: "L-101",
          status: "open",
          created_by: "user-creator",
          created_at: "2026-07-01T00:00:00.000Z",
          permission_envelope_id: "perm-people-task-write-flow",
          audit_trace_id: "audit-people-task-write-flow",
        },
        {
          model_type: "MatterMember",
          tenant_id: TENANT,
          matter_id: MATTER_ID,
          member_id: "member-other-assignee",
          employee_id: OTHER_EMPLOYEE_ID,
          user_id: OTHER_USER_ID,
          role: "associate",
          status: "active",
          valid_from: "2026-07-01T00:00:00.000Z",
          identity_resolution_state: "resolved",
        },
        {
          model_type: "MatterMember",
          tenant_id: TENANT,
          matter_id: MATTER_ID,
          member_id: "member-expired-assignee",
          employee_id: EXPIRED_EMPLOYEE_ID,
          user_id: EXPIRED_USER_ID,
          role: "associate",
          status: "active",
          valid_from: "2026-07-01T00:00:00.000Z",
          valid_to: "2026-07-30T23:59:59.999Z",
          identity_resolution_state: "resolved",
        },
      ],
    }),
  });

  const mismatchedAttorney = await handleMatterApiRequest({
    pathname: `/api/matters/${MATTER_ID}/team-members`,
    method: "POST",
    body: {
      tenant_id: TENANT,
      permission_ref: "perm-people-task-write-flow",
      audit_hint_ref: "audit-people-task-write-flow",
      idempotency_key: "member-mismatched",
      member: {
        member_id: "member-mismatched",
        tenant_id: TENANT,
        employee_id: EMPLOYEE_ID,
        user_id: OTHER_USER_ID,
        role: "responsible_attorney",
        status: "active",
        valid_from: "2026-07-01T00:00:00.000Z",
      },
    },
    context: matterPermissionContext(),
    requestId: "member-mismatched",
    runtime: matterRuntime,
  });
  assert.equal(mismatchedAttorney.status, 400);
  assert.equal(
    matterRuntime.repository.get({ tenant_id: TENANT, model_type: "Matter", matter_id: MATTER_ID }).owner_user_id,
    undefined,
  );

  for (const [employeeId, reason] of [
    ["emp-revoked", "revoked-link"],
    ["emp-inactive", "inactive-employee"],
    ["emp-ambiguous", "ambiguous-link"],
    ["emp-cross-tenant", "cross-tenant-link"],
  ]) {
    const invalidAttorney = await handleMatterApiRequest({
      pathname: `/api/matters/${MATTER_ID}/team-members`,
      method: "POST",
      body: {
        tenant_id: TENANT,
        permission_ref: "perm-people-task-write-flow",
        audit_hint_ref: "audit-people-task-write-flow",
        idempotency_key: `member-${reason}`,
        member: {
          member_id: `member-${reason}`,
          tenant_id: TENANT,
          employee_id: employeeId,
          role: "responsible_attorney",
          status: "active",
          valid_from: "2026-07-01T00:00:00.000Z",
        },
      },
      context: matterPermissionContext(),
      requestId: `member-${reason}`,
      runtime: matterRuntime,
    });
    assert.equal(invalidAttorney.status, 400, reason);
    assert.equal(
      matterRuntime.repository.get({
        tenant_id: TENANT,
        model_type: "MatterMember",
        member_id: `member-${reason}`,
      }),
      undefined,
      reason,
    );
  }
  assert.equal(
    matterRuntime.repository.get({ tenant_id: TENANT, model_type: "Matter", matter_id: MATTER_ID }).owner_user_id,
    undefined,
  );

  const danglingAttorney = await handleMatterApiRequest({
    pathname: `/api/matters/${MATTER_ID}/team-members`,
    method: "POST",
    body: {
      tenant_id: TENANT,
      permission_ref: "perm-people-task-write-flow",
      audit_hint_ref: "audit-people-task-write-flow",
      idempotency_key: "member-dangling-user",
      member: {
        member_id: "member-dangling-user",
        tenant_id: TENANT,
        employee_id: "emp-dangling",
        role: "responsible_attorney",
        status: "active",
        valid_from: "2026-07-01T00:00:00.000Z",
      },
    },
    context: matterPermissionContext(),
    requestId: "member-dangling-user",
    runtime: matterRuntime,
  });
  assert.equal(danglingAttorney.status, 400);
  assert.equal(
    matterRuntime.repository.get({ tenant_id: TENANT, model_type: "Matter", matter_id: MATTER_ID }).owner_user_id,
    undefined,
  );

  const responsibleAttorney = await handleMatterApiRequest({
    pathname: `/api/matters/${MATTER_ID}/team-members`,
    method: "POST",
    body: {
      tenant_id: TENANT,
      permission_ref: "perm-people-task-write-flow",
      audit_hint_ref: "audit-people-task-write-flow",
      idempotency_key: "member-responsible",
      member: {
        member_id: "member-assignee",
        tenant_id: TENANT,
        employee_id: EMPLOYEE_ID,
        role: "responsible_attorney",
        status: "active",
        valid_from: "2026-07-01T00:00:00.000Z",
      },
    },
    context: matterPermissionContext(),
    requestId: "member-responsible",
    runtime: matterRuntime,
  });
  assert.equal(responsibleAttorney.status, 201);
  assert.equal(responsibleAttorney.body.item.employee_id, EMPLOYEE_ID);
  assert.equal(responsibleAttorney.body.item.user_id, USER_ID);
  assert.equal(responsibleAttorney.body.owner_assignment.owner_user_id, USER_ID);
  assert.equal(responsibleAttorney.body.matter.owner_user_id, USER_ID);

  const scheduledResponsibleAttorney = await handleMatterApiRequest({
    pathname: `/api/matters/${MATTER_ID}/team-members`,
    method: "POST",
    body: {
      tenant_id: TENANT,
      permission_ref: "perm-people-task-write-flow",
      audit_hint_ref: "audit-people-task-write-flow",
      idempotency_key: "member-future-responsible",
      member: {
        member_id: "member-future-assignee",
        tenant_id: TENANT,
        employee_id: FUTURE_EMPLOYEE_ID,
        role: "responsible_attorney",
        status: "active",
        valid_from: "2026-08-01T00:00:00.000Z",
      },
    },
    context: matterPermissionContext(),
    requestId: "member-future-responsible",
    runtime: matterRuntime,
  });
  assert.equal(scheduledResponsibleAttorney.status, 201);
  assert.equal(scheduledResponsibleAttorney.body.item.user_id, FUTURE_USER_ID);
  assert.equal(scheduledResponsibleAttorney.body.owner_assignment, null);
  assert.equal(scheduledResponsibleAttorney.body.matter, null);
  assert.equal(
    matterRuntime.repository.get({
      tenant_id: TENANT,
      model_type: "MatterMember",
      member_id: "member-future-assignee",
    }).valid_from,
    "2026-08-01T00:00:00.000Z",
  );
  assert.equal(
    matterRuntime.repository.get({
      tenant_id: TENANT,
      model_type: "Matter",
      matter_id: MATTER_ID,
    }).owner_user_id,
    USER_ID,
  );

  const historicalOwnerChange = await handleMatterApiRequest({
    pathname: `/api/matters/${MATTER_ID}/owner-change`,
    method: "POST",
    body: {
      tenant_id: TENANT,
      permission_ref: "perm-people-task-write-flow",
      audit_hint_ref: "audit-people-task-write-flow",
      idempotency_key: "owner-expired-historical-time",
      assigned_at: "2026-07-15T00:00:00.000Z",
      owner: {
        employee_id: EXPIRED_EMPLOYEE_ID,
      },
    },
    context: matterPermissionContext(),
    requestId: "owner-expired-historical-time",
    runtime: matterRuntime,
  });
  assert.equal(historicalOwnerChange.status, 400);
  assert.equal(
    matterRuntime.repository.get({
      tenant_id: TENANT,
      model_type: "Matter",
      matter_id: MATTER_ID,
    }).owner_user_id,
    USER_ID,
  );

  const created = await handleMatterApiRequest({
    pathname: `/api/matters/${MATTER_ID}/activities`,
    method: "POST",
    body: {
      tenant_id: TENANT,
      permission_ref: "perm-people-task-write-flow",
      audit_hint_ref: "audit-people-task-write-flow",
      idempotency_key: "create-assigned-task",
      occurred_at: AS_OF,
      activity: {
        activity_id: "task-assigned-from-matter",
        activity_type: "task",
        title: "오늘 준비서면",
        status: "todo",
        due_at: "2026-07-31T09:00:00+09:00",
        assigned_to_user_id: USER_ID,
      },
    },
    context: matterPermissionContext(),
    requestId: "create-assigned-task",
    runtime: matterRuntime,
  });

  assert.equal(created.status, 201);
  assert.equal(created.body.item.assigned_to_user_id, USER_ID);
  assert.equal(
    matterRuntime.repository.get({
      tenant_id: TENANT,
      model_type: "MatterTask",
      task_id: "task-assigned-from-matter",
    }).assigned_to_user_id,
    USER_ID,
  );

  const brief = handleHrxApiRequest({
    pathname: `/api/hrx/people/members/${EMPLOYEE_ID}/daily-brief`,
    method: "GET",
    context: peopleRuntimeContext(peopleRepository),
    matterContext: matterRuntime,
    requestContext: {
      tenant_id: TENANT,
      actor_id: USER_ID,
      actor_role: "staff",
      hrx_scopes: ["hrx.employee.read"],
      session_bound: true,
    },
    permissionContext: peoplePermissionContext(),
  });

  assert.equal(brief.status, 200);
  assert.deepEqual(
    brief.body.data.tasks.due_only.map(({ task_id }) => task_id),
    ["task-assigned-from-matter"],
  );

  for (const [assignedToUserId, reason] of [
    ["user-does-not-exist", "missing"],
    [EMPLOYEE_ID, "employee-id"],
    ["user-cross-tenant", "cross-tenant"],
    ["user-revoked", "revoked"],
    ["user-dangling", "dangling-user"],
    ["user-inactive", "inactive-employee"],
    ["user-wrong-purpose", "wrong-link-purpose"],
    ["user-no-team", "non-team"],
  ]) {
    const invalid = await handleMatterApiRequest({
      pathname: `/api/matters/${MATTER_ID}/activities`,
      method: "POST",
      body: {
        tenant_id: TENANT,
        permission_ref: "perm-people-task-write-flow",
        audit_hint_ref: "audit-people-task-write-flow",
        idempotency_key: `create-invalid-${reason}`,
        occurred_at: AS_OF,
        activity: {
          activity_id: `task-invalid-${reason}`,
          activity_type: "task",
          title: "잘못된 담당자",
          status: "todo",
          assigned_to_user_id: assignedToUserId,
        },
      },
      context: matterPermissionContext(),
      requestId: `create-invalid-${reason}`,
      runtime: matterRuntime,
    });
    assert.equal(invalid.status, 400, reason);
    assert.deepEqual(invalid.body.safe_error_codes, ["MATTER_API_VALIDATION_ERROR"]);
    assert.equal(
      matterRuntime.repository.get({
        tenant_id: TENANT,
        model_type: "MatterTask",
        task_id: `task-invalid-${reason}`,
      }),
      undefined,
    );
  }

  const historicalExpiredAssignment = await handleMatterApiRequest({
    pathname: `/api/matters/${MATTER_ID}/activities`,
    method: "POST",
    body: {
      tenant_id: TENANT,
      permission_ref: "perm-people-task-write-flow",
      audit_hint_ref: "audit-people-task-write-flow",
      idempotency_key: "create-expired-historical-time",
      occurred_at: "2026-07-15T00:00:00.000Z",
      activity: {
        activity_id: "task-expired-historical-time",
        activity_type: "task",
        title: "과거 시각 우회",
        status: "todo",
        assigned_to_user_id: EXPIRED_USER_ID,
      },
    },
    context: matterPermissionContext(),
    requestId: "create-expired-historical-time",
    runtime: matterRuntime,
  });
  assert.equal(historicalExpiredAssignment.status, 400);
  assert.equal(
    matterRuntime.repository.get({
      tenant_id: TENANT,
      model_type: "MatterTask",
      task_id: "task-expired-historical-time",
    }),
    undefined,
  );

  const futureCallerTimeAssignment = await handleMatterApiRequest({
    pathname: `/api/matters/${MATTER_ID}/activities`,
    method: "POST",
    body: {
      tenant_id: TENANT,
      permission_ref: "perm-people-task-write-flow",
      audit_hint_ref: "audit-people-task-write-flow",
      idempotency_key: "create-future-caller-time",
      occurred_at: "2026-08-02T00:00:00.000Z",
      activity: {
        activity_id: "task-future-caller-time",
        activity_type: "task",
        title: "미래 시각 우회",
        status: "todo",
        assigned_to_user_id: FUTURE_USER_ID,
      },
    },
    context: matterPermissionContext(),
    requestId: "create-future-caller-time",
    runtime: matterRuntime,
  });
  assert.equal(futureCallerTimeAssignment.status, 400);
  assert.equal(
    matterRuntime.repository.get({
      tenant_id: TENANT,
      model_type: "MatterTask",
      task_id: "task-future-caller-time",
    }),
    undefined,
  );

  const invalidPatch = await handleMatterApiRequest({
    pathname: `/api/matters/${MATTER_ID}/activities/task-assigned-from-matter`,
    method: "PATCH",
    body: {
      tenant_id: TENANT,
      permission_ref: "perm-people-task-write-flow",
      audit_hint_ref: "audit-people-task-write-flow",
      idempotency_key: "reassign-task-invalid",
      occurred_at: "2026-07-15T00:00:00.000Z",
      patch: {
        status: "in_progress",
        title: "변경되면 안 되는 제목",
        due_at: "2026-08-01T09:00:00+09:00",
        starts_at: "2026-08-01T10:00:00+09:00",
        ends_at: "2026-08-01T11:00:00+09:00",
        estimated_minutes: 60,
        assigned_to_user_id: EXPIRED_USER_ID,
      },
    },
    context: matterPermissionContext(),
    requestId: "reassign-task-invalid",
    runtime: matterRuntime,
  });
  assert.equal(invalidPatch.status, 400);
  assert.equal(
    matterRuntime.repository.get({
      tenant_id: TENANT,
      model_type: "MatterTask",
      task_id: "task-assigned-from-matter",
    }).assigned_to_user_id,
    USER_ID,
  );
  assert.equal(
    matterRuntime.repository.get({
      tenant_id: TENANT,
      model_type: "MatterTask",
      task_id: "task-assigned-from-matter",
    }).status,
    "todo",
  );
  const unchangedAfterInvalidPatch = matterRuntime.repository.get({
    tenant_id: TENANT,
    model_type: "MatterTask",
    task_id: "task-assigned-from-matter",
  });
  assert.equal(unchangedAfterInvalidPatch.title, "오늘 준비서면");
  assert.equal(unchangedAfterInvalidPatch.due_at, "2026-07-31T00:00:00.000Z");
  assert.equal(unchangedAfterInvalidPatch.starts_at, null);
  assert.equal(unchangedAfterInvalidPatch.ends_at, null);
  assert.equal(unchangedAfterInvalidPatch.estimated_minutes, null);
  assert.equal(
    matterRuntime.repository.listAudit({ tenant_id: TENANT }).some((event) => (
      event.action === "matter.task.transition"
      && event.object_id === "task-assigned-from-matter"
    )),
    false,
  );

  const updated = await handleMatterApiRequest({
    pathname: `/api/matters/${MATTER_ID}/activities/task-assigned-from-matter`,
    method: "PATCH",
    body: {
      tenant_id: TENANT,
      permission_ref: "perm-people-task-write-flow",
      audit_hint_ref: "audit-people-task-write-flow",
      idempotency_key: "reassign-task",
      occurred_at: AS_OF,
      patch: {
        status: "in_progress",
        assigned_to_user_id: OTHER_USER_ID,
      },
    },
    context: matterPermissionContext(),
    requestId: "reassign-task",
    runtime: matterRuntime,
  });

  assert.equal(updated.status, 200);
  assert.equal(updated.body.item.assigned_to_user_id, OTHER_USER_ID);

  const reassignedBrief = handleHrxApiRequest({
    pathname: `/api/hrx/people/members/${OTHER_EMPLOYEE_ID}/daily-brief`,
    method: "GET",
    context: peopleRuntimeContext(peopleRepository),
    matterContext: matterRuntime,
    requestContext: {
      tenant_id: TENANT,
      actor_id: OTHER_USER_ID,
      actor_role: "staff",
      hrx_scopes: ["hrx.employee.read"],
      session_bound: true,
    },
    permissionContext: peoplePermissionContext(OTHER_USER_ID),
  });

  assert.equal(reassignedBrief.status, 200);
  assert.deepEqual(
    reassignedBrief.body.data.tasks.due_only.map(({ task_id }) => task_id),
    ["task-assigned-from-matter"],
  );

  const replayBody = {
    tenant_id: TENANT,
    permission_ref: "perm-people-task-write-flow",
    audit_hint_ref: "audit-people-task-write-flow",
    idempotency_key: "create-replay-current",
    occurred_at: AS_OF,
    activity: {
      activity_id: "task-replay-current",
      activity_type: "task",
      title: "현재 권한으로 생성",
      status: "todo",
      assigned_to_user_id: USER_ID,
    },
  };
  const replayCreated = await handleMatterApiRequest({
    pathname: `/api/matters/${MATTER_ID}/activities`,
    method: "POST",
    body: replayBody,
    context: matterPermissionContext(),
    requestId: "create-replay-current",
    runtime: matterRuntime,
  });
  assert.equal(replayCreated.status, 201);

  matterRuntime.repository.update({
    tenant_id: TENANT,
    model_type: "MatterMember",
    member_id: "member-assignee",
  }, {
    valid_to: AS_OF,
  });
  authorityNow = "2026-08-01T00:30:00.000Z";

  const replayedAfterMembershipEnded = await handleMatterApiRequest({
    pathname: `/api/matters/${MATTER_ID}/activities`,
    method: "POST",
    body: replayBody,
    context: matterPermissionContext(),
    requestId: "create-replay-current-second-call",
    runtime: matterRuntime,
  });
  assert.equal(replayedAfterMembershipEnded.status, 200);
  assert.equal(replayedAfterMembershipEnded.body.outcome, "idempotent_replay");
  assert.equal(replayedAfterMembershipEnded.body.idempotent_replay, true);
  assert.equal(
    matterRuntime.repository
      .list({ tenant_id: TENANT, model_type: "MatterTask", matter_id: MATTER_ID })
      .filter(({ task_id }) => task_id === "task-replay-current")
      .length,
    1,
  );

  const newHistoricalWriteAfterMembershipEnded = await handleMatterApiRequest({
    pathname: `/api/matters/${MATTER_ID}/activities`,
    method: "POST",
    body: {
      ...replayBody,
      idempotency_key: "create-new-historical-after-ended",
      activity: {
        ...replayBody.activity,
        activity_id: "task-new-historical-after-ended",
      },
    },
    context: matterPermissionContext(),
    requestId: "create-new-historical-after-ended",
    runtime: matterRuntime,
  });
  assert.equal(newHistoricalWriteAfterMembershipEnded.status, 400);
  assert.equal(
    matterRuntime.repository.get({
      tenant_id: TENANT,
      model_type: "MatterTask",
      task_id: "task-new-historical-after-ended",
    }),
    undefined,
  );
});
