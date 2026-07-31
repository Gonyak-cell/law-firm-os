import assert from "node:assert/strict";
import test from "node:test";
import { handleMatterDetail, createMatterRuntimeContext } from "../src/matter-runtime-context.js";
import { createMatter, createMatterMember } from "../../../packages/matter/src/model.js";
import { createMatterRepository } from "../../../packages/matter/src/repository.js";

const TENANT = "tenant-matter-assignee-label";
const MATTER_ID = "matter-assignee-label";
const AS_OF = "2026-07-31T12:00:00.000Z";

test("Matter detail resolves team display names from the employee directory without changing user_id", () => {
  const repository = createMatterRepository({
    seedRecords: [
      createMatter({
        matter_id: MATTER_ID,
        tenant_id: TENANT,
        client_id: "client-assignee-label",
        title: "담당자 표시 확인 Matter",
        status: "open",
        created_by: "user-viewer",
        created_at: "2026-07-31T00:00:00.000Z",
        permission_envelope_id: "perm-matter-assignee-label",
        audit_trace_id: "audit-matter-assignee-label",
      }),
      createMatterMember({
        member_id: "member-owner",
        tenant_id: TENANT,
        matter_id: MATTER_ID,
        employee_id: "emp-owner",
        user_id: "user-owner",
        role: "responsible_attorney",
        status: "active",
        valid_from: "2026-07-01T00:00:00.000Z",
        identity_resolution_state: "resolved",
      }),
      createMatterMember({
        member_id: "member-associate",
        tenant_id: TENANT,
        matter_id: MATTER_ID,
        employee_id: "emp-associate",
        user_id: "user-associate",
        role: "associate",
        status: "active",
        valid_from: "2026-07-01T00:00:00.000Z",
        identity_resolution_state: "resolved",
      }),
      createMatterMember({
        member_id: "member-terminated",
        tenant_id: TENANT,
        matter_id: MATTER_ID,
        employee_id: "emp-terminated",
        user_id: "user-terminated",
        role: "associate",
        status: "active",
        valid_from: "2026-07-01T00:00:00.000Z",
        identity_resolution_state: "resolved",
      }),
      createMatterMember({
        member_id: "member-expired",
        tenant_id: TENANT,
        matter_id: MATTER_ID,
        employee_id: "emp-expired",
        user_id: "user-expired",
        role: "associate",
        status: "active",
        valid_from: "2019-01-01T00:00:00.000Z",
        valid_to: "2020-01-01T00:00:00.000Z",
        identity_resolution_state: "resolved",
      }),
      createMatterMember({
        member_id: "member-cross-tenant",
        tenant_id: TENANT,
        matter_id: MATTER_ID,
        employee_id: "emp-cross-tenant",
        user_id: "user-cross-tenant",
        role: "associate",
        status: "active",
        valid_from: "2026-07-01T00:00:00.000Z",
        identity_resolution_state: "resolved",
      }),
      createMatterMember({
        member_id: "member-no-valid-from",
        tenant_id: TENANT,
        matter_id: MATTER_ID,
        employee_id: "emp-no-valid-from",
        user_id: "user-no-valid-from",
        role: "associate",
        status: "active",
        identity_resolution_state: "resolved",
      }),
      createMatterMember({
        member_id: "member-opaque-name",
        tenant_id: TENANT,
        matter_id: MATTER_ID,
        employee_id: "emp-opaque-name",
        user_id: "user-opaque-name",
        role: "associate",
        status: "active",
        valid_from: "2026-07-01T00:00:00.000Z",
        identity_resolution_state: "resolved",
      }),
      createMatterMember({
        member_id: "member-opaque-title",
        tenant_id: TENANT,
        matter_id: MATTER_ID,
        employee_id: "emp-opaque-title",
        user_id: "user-opaque-title",
        role: "associate",
        status: "active",
        valid_from: "2026-07-01T00:00:00.000Z",
        identity_resolution_state: "resolved",
      }),
    ],
  });
  const employees = new Map([
    ["emp-owner", { tenant_id: TENANT, employee_id: "emp-owner", display_name: "김민호", title: "대표 변호사", status: "active" }],
    ["emp-associate", { tenant_id: TENANT, employee_id: "emp-associate", display_name: "이서준", title: "변호사", status: "active" }],
    ["emp-terminated", { tenant_id: TENANT, employee_id: "emp-terminated", display_name: "퇴사자", title: "변호사", status: "terminated" }],
    ["emp-expired", { tenant_id: TENANT, employee_id: "emp-expired", display_name: "만료된 담당자", title: "변호사", status: "active" }],
    ["emp-cross-tenant", { tenant_id: TENANT, employee_id: "emp-cross-tenant", display_name: "외부 테넌트 사용자", title: "변호사", status: "active" }],
    ["emp-no-valid-from", { tenant_id: TENANT, employee_id: "emp-no-valid-from", display_name: "유효기간 없는 사용자", title: "변호사", status: "active" }],
    ["emp-opaque-name", { tenant_id: TENANT, employee_id: "emp-opaque-name", display_name: "aad-object-42", title: "지원 변호사", status: "active" }],
    ["emp-opaque-title", { tenant_id: TENANT, employee_id: "emp-opaque-title", display_name: "박지원", title: "aad_object_42", status: "active" }],
  ]);
  const runtime = createMatterRuntimeContext({
    repository,
    employeeDirectory: { get: ({ tenant_id, employee_id }) => {
      const employee = employees.get(employee_id);
      return employee?.tenant_id === tenant_id ? employee : null;
    } },
    employeeUserLinkDirectory: {
      listEmployeeUserLinks: ({ tenant_id, user_id } = {}) => [
        { tenant_id: TENANT, employee_id: "emp-owner", user_id: "user-owner", purpose: "login_mapping" },
        { tenant_id: TENANT, employee_id: "emp-associate", user_id: "user-associate", purpose: "login_mapping" },
        { tenant_id: TENANT, employee_id: "emp-terminated", user_id: "user-terminated", purpose: "login_mapping" },
        { tenant_id: TENANT, employee_id: "emp-expired", user_id: "user-expired", purpose: "login_mapping" },
        { tenant_id: "tenant-other", employee_id: "emp-cross-tenant", user_id: "user-cross-tenant", purpose: "login_mapping" },
        { tenant_id: TENANT, employee_id: "emp-no-valid-from", user_id: "user-no-valid-from", purpose: "login_mapping" },
        { tenant_id: TENANT, employee_id: "emp-opaque-name", user_id: "user-opaque-name", purpose: "login_mapping" },
        { tenant_id: TENANT, employee_id: "emp-opaque-title", user_id: "user-opaque-title", purpose: "login_mapping" },
      ].filter((link) => link.tenant_id === tenant_id && (!user_id || link.user_id === user_id)),
    },
    userDirectory: {
      listUsers: ({ tenant_id, user_id } = {}) => [
        { tenant_id: TENANT, user_id: "user-owner", status: "active" },
        { tenant_id: TENANT, user_id: "user-associate", status: "active" },
        { tenant_id: TENANT, user_id: "user-terminated", status: "active" },
        { tenant_id: TENANT, user_id: "user-expired", status: "active" },
        { tenant_id: "tenant-other", user_id: "user-cross-tenant", status: "active" },
        { tenant_id: TENANT, user_id: "user-no-valid-from", status: "active" },
        { tenant_id: TENANT, user_id: "user-opaque-name", status: "active" },
        { tenant_id: TENANT, user_id: "user-opaque-title", status: "active" },
      ].filter((user) => user.tenant_id === tenant_id && (!user_id || user.user_id === user_id)),
    },
    clock: () => AS_OF,
  });
  const result = handleMatterDetail({
    matterId: MATTER_ID,
    query: {
      tenant_id: TENANT,
      permission_ref: "matter-assignee-label-read",
      audit_hint_ref: "matter-assignee-label-read",
    },
    context: {
      principal: { user_id: "user-viewer", tenant_id: TENANT },
      rules: [{ id: "allow-matter-read", effect: "allow", action: "*" }],
      object_acl: [],
    },
    requestId: "request-matter-assignee-label",
    runtime,
  });

  assert.equal(result.status, 200);
  assert.deepEqual(
    result.body.team.map(({ user_id, display_name, title, identity_resolution_state, assignment_eligible }) => ({
      user_id,
      display_name,
      title,
      identity_resolution_state,
      assignment_eligible,
    })),
    [
      {
        user_id: "user-owner",
        display_name: "김민호",
        title: "대표 변호사",
        identity_resolution_state: "resolved",
        assignment_eligible: true,
      },
      {
        user_id: "user-associate",
        display_name: "이서준",
        title: "변호사",
        identity_resolution_state: "resolved",
        assignment_eligible: true,
      },
      {
        user_id: "user-terminated",
        display_name: "퇴사자",
        title: "변호사",
        identity_resolution_state: "unresolved",
        assignment_eligible: false,
      },
      {
        user_id: "user-expired",
        display_name: "만료된 담당자",
        title: "변호사",
        identity_resolution_state: "unresolved",
        assignment_eligible: false,
      },
      {
        user_id: "user-cross-tenant",
        display_name: "외부 테넌트 사용자",
        title: "변호사",
        identity_resolution_state: "unresolved",
        assignment_eligible: false,
      },
      {
        user_id: "user-no-valid-from",
        display_name: "유효기간 없는 사용자",
        title: "변호사",
        identity_resolution_state: "unresolved",
        assignment_eligible: false,
      },
      {
        user_id: "user-opaque-name",
        display_name: null,
        title: "지원 변호사",
        identity_resolution_state: "resolved",
        assignment_eligible: true,
      },
      {
        user_id: "user-opaque-title",
        display_name: "박지원",
        title: null,
        identity_resolution_state: "resolved",
        assignment_eligible: true,
      },
    ],
  );
});
