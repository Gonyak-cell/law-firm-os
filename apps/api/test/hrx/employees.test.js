import assert from "node:assert/strict";
import test from "node:test";
import { createHrxAuditEventStore } from "../../../../packages/audit/src/hrx-event-store.js";
import { createInMemoryHrxRepository } from "../../../../packages/hrx/src/repository.js";
import { createHrxRuntimeContext, handleHrxApiRequest } from "../../src/hrx-runtime-context.js";
import { createHrxEmployeeUserLinksRoute, createHrxEmployeesRoute } from "../../src/routes/hrx/employees.js";

function allowAuthz() {
  return { evaluate: async () => ({ effect: "allow", reason: "test_allow" }) };
}

test("HRX employees route POST GET PATCH persists and audits", async () => {
  const audit = createHrxAuditEventStore();
  const route = createHrxEmployeesRoute({
    repository: createInMemoryHrxRepository(),
    authz: allowAuthz(),
    audit,
  });
  const context = { tenant_id: "tenant-a", actor_id: "user-a", actor_role: "hr_admin" };

  const created = await route.handle({
    method: "POST",
    context,
    body: { employee_id: "emp-001", display_name: "Ari Kim" },
  });
  assert.equal(created.status, 201);
  assert.equal(created.body.employee.employee_id, "emp-001");
  assert.equal(created.body.employee.status, "onboarding");

  const read = await route.handle({ method: "GET", context, params: { employee_id: "emp-001" } });
  assert.equal(read.status, 200);
  assert.equal(read.body.employee.display_name, "Ari Kim");

  const patched = await route.handle({
    method: "PATCH",
    context,
    params: { employee_id: "emp-001" },
    body: { display_name: "Ari K.", status: "probation" },
  });
  assert.equal(patched.status, 200);
  assert.equal(patched.body.employee.status, "probation");
  assert.equal(audit.list({ tenant_id: "tenant-a" }).length, 3);

  const invalid = await route.handle({
    method: "PATCH",
    context,
    params: { employee_id: "emp-001" },
    body: { status: "onboarding" },
  });
  assert.equal(invalid.status, 400);
  assert.match(invalid.body.reason, /cannot transition from probation to onboarding/);
});

test("HRX employees route maps authz deny to safe 403", async () => {
  const route = createHrxEmployeesRoute({
    repository: createInMemoryHrxRepository(),
    authz: { evaluate: async () => ({ effect: "deny", reason: "test_deny" }) },
    audit: createHrxAuditEventStore(),
  });
  const response = await route.handle({
    method: "POST",
    context: { tenant_id: "tenant-a", actor_id: "user-a" },
    body: { employee_id: "emp-001", display_name: "Ari Kim", status: "active" },
  });
  assert.equal(response.status, 403);
  assert.equal(response.body.safe_error_code, "HRX_PERMISSION_DENIED");
});

test("HRX employees route never presents opaque identifiers as employee names", async () => {
  const route = createHrxEmployeesRoute({
    repository: createInMemoryHrxRepository(),
    authz: allowAuthz(),
    audit: createHrxAuditEventStore(),
  });
  const context = { tenant_id: "tenant-a", actor_id: "user-a", actor_role: "hr_admin" };
  const created = await route.handle({
    method: "POST",
    context,
    body: { employee_id: "emp-opaque", display_name: "AAD-OBJECT-42" },
  });
  assert.equal(created.status, 201);
  assert.equal(created.body.employee.display_name, "구성원 이름 확인 필요");

  const read = await route.handle({
    method: "GET",
    context,
    params: { employee_id: "emp-opaque" },
  });
  assert.equal(read.body.employee.display_name, "구성원 이름 확인 필요");

  const patched = await route.handle({
    method: "PATCH",
    context,
    params: { employee_id: "emp-opaque" },
    body: { display_name: "lawyer@example.com" },
  });
  assert.equal(patched.status, 200);
  assert.equal(patched.body.employee.display_name, "구성원 이름 확인 필요");
});

test("HRX employee user-link route creates lists and revokes audited login mappings", async () => {
  const audit = createHrxAuditEventStore();
  const repository = createInMemoryHrxRepository({
    employees: [{ tenant_id: "tenant-a", employee_id: "emp-001", display_name: "Ari Kim", status: "active" }],
  });
  const route = createHrxEmployeeUserLinksRoute({
    repository,
    authz: allowAuthz(),
    audit,
  });
  const context = { tenant_id: "tenant-a", actor_id: "user-a", actor_role: "hr_admin" };

  const created = await route.handle({
    method: "POST",
    context,
    body: {
      link_id: "link-001",
      employee_id: "emp-001",
      user_id: "iam-user-001",
    },
  });
  assert.equal(created.status, 201);
  assert.equal(created.body.link.purpose, "login_mapping");

  const listed = await route.handle({
    method: "GET",
    context,
    query: { employee_id: "emp-001" },
  });
  assert.equal(listed.status, 200);
  assert.equal(listed.body.links.length, 1);

  const revoked = await route.handle({
    method: "POST",
    context,
    params: { link_id: "link-001" },
  });
  assert.equal(revoked.status, 200);
  assert.equal(revoked.body.revoked, true);

  const actions = audit.list({ tenant_id: "tenant-a" }).map((event) => event.action);
  assert.deepEqual(actions, [
    "hrx.employee_user_link.create",
    "hrx.employee_user_link.read",
    "hrx.employee_user_link.revoke",
  ]);
});

test("HRX employee route returns a safe duplicate identifier conflict", async () => {
  const route = createHrxEmployeesRoute({
    repository: createInMemoryHrxRepository(),
    authz: allowAuthz(),
    audit: createHrxAuditEventStore(),
  });
  const context = { tenant_id: "tenant-a", actor_id: "user-a", actor_role: "hr_admin" };
  const body = { employee_id: "emp-duplicate", display_name: "중복 구성원" };
  assert.equal((await route.handle({ method: "POST", context, body })).status, 201);
  const duplicate = await route.handle({ method: "POST", context, body });
  assert.equal(duplicate.status, 409);
  assert.equal(duplicate.body.safe_error_code, "HRX_EMPLOYEE_ID_ALREADY_EXISTS");
});

const RUNTIME_TENANT = "tenant-employee-management";
const RUNTIME_ACTOR = Object.freeze({
  tenant_id: RUNTIME_TENANT,
  actor_id: "user-people-ops",
  actor_role: "people_ops",
  hrx_scopes: ["hrx.employee.read", "hrx.employee.write"],
  session_bound: true,
});

function runtimeRequest(context, pathname, method = "GET", body = {}, query = {}) {
  return handleHrxApiRequest({
    pathname,
    method,
    body,
    query,
    context,
    matterContext: {
      userDirectory: {
        listUsers: ({ tenant_id, user_id } = {}) => [
          {
            tenant_id: RUNTIME_TENANT,
            user_id: "iam-user-a",
            display_name: "김가람",
            email: "garam@example.test",
            status: "active",
            login_allowed: true,
          },
          {
            tenant_id: RUNTIME_TENANT,
            user_id: "iam-user-b",
            display_name: "이보람",
            email: "boram@example.test",
            status: "active",
            login_allowed: true,
          },
          {
            tenant_id: RUNTIME_TENANT,
            user_id: "iam-user-disabled",
            display_name: "비활성 계정",
            email: "disabled@example.test",
            status: "active",
            login_allowed: false,
          },
          {
            tenant_id: "tenant-other",
            user_id: "iam-user-cross-tenant",
            display_name: "다른 조직 계정",
            email: "other@example.test",
            status: "active",
            login_allowed: true,
          },
          {
            tenant_id: RUNTIME_TENANT,
            user_id: "iam-user-login-unknown",
            display_name: "로그인 상태 미확인",
            email: "unknown@example.test",
            status: "active",
          },
          {
            tenant_id: RUNTIME_TENANT,
            user_id: "iam-user-email-label",
            display_name: "표시 가능한 이름",
            email: "iam-user-email-label@example.test",
            status: "active",
            login_allowed: true,
          },
          {
            tenant_id: RUNTIME_TENANT,
            user_id: "iam-user-only-email",
            display_name: null,
            email: "iam-user-only-email@example.test",
            status: "active",
            login_allowed: true,
          },
          {
            tenant_id: RUNTIME_TENANT,
            user_id: "iam-user-name-substring",
            display_name: "검토자 (iam-user-name-substring)",
            email: "reviewer@example.test",
            status: "active",
            login_allowed: true,
          },
          {
            tenant_id: RUNTIME_TENANT,
            user_id: "iam-user-email-substring",
            display_name: null,
            email: "reviewer+iam-user-email-substring@example.test",
            status: "active",
            login_allowed: true,
          },
        ].filter((user) => (
          (!tenant_id || user.tenant_id === tenant_id)
          && (!user_id || user.user_id === user_id)
        )),
      },
    },
    requestContext: RUNTIME_ACTOR,
  });
}

function employeeManagementRuntime() {
  const repository = createInMemoryHrxRepository({
    employees: [
      { tenant_id: RUNTIME_TENANT, employee_id: "emp-a", display_name: "김가람", status: "active" },
      { tenant_id: RUNTIME_TENANT, employee_id: "emp-b", display_name: "이보람", status: "active" },
    ],
    employment_profiles: [
      {
        tenant_id: RUNTIME_TENANT,
        profile_id: "profile-a",
        employee_id: "emp-a",
        employment_type: "full_time",
        status: "active",
        title: "어소시에이트",
        org_unit_id: "group_litigation",
        manager_employee_id: null,
        effective_from: "2026-01-01",
        source_ref: "test:employee-management",
      },
      {
        tenant_id: RUNTIME_TENANT,
        profile_id: "profile-b",
        employee_id: "emp-b",
        employment_type: "full_time",
        status: "active",
        title: "파트너",
        org_unit_id: "group_firm_leadership",
        manager_employee_id: null,
        effective_from: "2026-01-01",
        source_ref: "test:employee-management",
      },
    ],
  });
  return createHrxRuntimeContext({
    repository,
    seedRuntimeFixtures: false,
    clock: () => "2026-07-30T02:00:00.000Z",
  });
}

test("HRX runtime employee create and update require server readback and preserve safe errors", () => {
  const context = employeeManagementRuntime();
  const created = runtimeRequest(context, "/api/hrx/employees", "POST", {
    employee_id: "emp-new",
    display_name: "박새로",
    work_email: "new@example.test",
    status: "active",
  });
  assert.equal(created.status, 201);
  const readback = runtimeRequest(context, "/api/hrx/employees/emp-new");
  assert.equal(readback.status, 200);
  assert.equal(readback.body.employee.display_name, "박새로");

  const updated = runtimeRequest(context, "/api/hrx/employees/emp-new", "PATCH", {
    display_name: "박새롬",
  });
  assert.equal(updated.status, 200);
  assert.equal(runtimeRequest(context, "/api/hrx/employees/emp-new").body.employee.display_name, "박새롬");

  const duplicate = runtimeRequest(context, "/api/hrx/employees", "POST", {
    employee_id: "emp-new",
    display_name: "중복",
  });
  assert.equal(duplicate.status, 409);
  assert.equal(duplicate.body.safe_error_code, "HRX_EMPLOYEE_ID_ALREADY_EXISTS");
});

test("HRX runtime create and PATCH responses fail closed for opaque names without hiding real names", () => {
  const context = employeeManagementRuntime();
  const opaqueCreated = runtimeRequest(context, "/api/hrx/employees", "POST", {
    employee_id: "emp-opaque-runtime",
    display_name: "AAD-OBJECT-42",
    status: "active",
  });
  assert.equal(opaqueCreated.status, 201);
  assert.equal(opaqueCreated.body.employee.display_name, "구성원 이름 확인 필요");

  const emailPatched = runtimeRequest(context, "/api/hrx/employees/emp-opaque-runtime", "PATCH", {
    display_name: "lawyer@example.com",
  });
  assert.equal(emailPatched.status, 200);
  assert.equal(emailPatched.body.employee.display_name, "구성원 이름 확인 필요");

  const genericUuidPatched = runtimeRequest(context, "/api/hrx/employees/emp-opaque-runtime", "PATCH", {
    display_name: "550e8400-e29b-01d4-0716-446655440000",
  });
  assert.equal(genericUuidPatched.status, 200);
  assert.equal(genericUuidPatched.body.employee.display_name, "구성원 이름 확인 필요");

  const embeddedReference = runtimeRequest(context, "/api/hrx/employees", "POST", {
    employee_id: "emp-x",
    display_name: "prefixEMP-Xpost",
    status: "active",
  });
  assert.equal(embeddedReference.status, 201);
  assert.equal(embeddedReference.body.employee.display_name, "구성원 이름 확인 필요");

  const legitimate = runtimeRequest(context, "/api/hrx/employees", "POST", {
    employee_id: "lee",
    display_name: "Leena Kim",
    status: "active",
  });
  assert.equal(legitimate.status, 201);
  assert.equal(legitimate.body.employee.display_name, "Leena Kim");
});

test("HRX runtime EmploymentProfile history is effective-dated and immutable as-of", () => {
  const context = employeeManagementRuntime();
  const scheduled = runtimeRequest(
    context,
    "/api/hrx/employees/emp-a/employment-profiles",
    "POST",
    {
      effective_from: "2026-08-01",
      title: "시니어 어소시에이트",
      employment_type: "full_time",
      status: "active",
    },
    { as_of: "2026-07-30" },
  );
  assert.equal(scheduled.status, 201);
  assert.equal(scheduled.body.current.profile_id, "profile-a");
  assert.equal(scheduled.body.scheduled.length, 1);

  const before = runtimeRequest(
    context,
    "/api/hrx/employees/emp-a/employment-profiles",
    "GET",
    {},
    { as_of: "2026-07-31" },
  );
  const after = runtimeRequest(
    context,
    "/api/hrx/employees/emp-a/employment-profiles",
    "GET",
    {},
    { as_of: "2026-08-01" },
  );
  assert.equal(before.body.current.title, "어소시에이트");
  assert.equal(after.body.current.title, "시니어 어소시에이트");
  assert.equal(before.body.current.effective_to, "2026-07-31");

  const overlap = runtimeRequest(
    context,
    "/api/hrx/employees/emp-a/employment-profiles",
    "POST",
    {
      effective_from: "2026-08-01",
      title: "중복",
      employment_type: "full_time",
      status: "active",
    },
  );
  assert.equal(overlap.status, 409);
  assert.equal(overlap.body.safe_error_code, "HRX_EMPLOYMENT_PERIOD_OVERLAP");
});

test("HRX runtime user-link rejects duplicate active users and keeps revoke audit history", () => {
  const context = employeeManagementRuntime();
  const linked = runtimeRequest(context, "/api/hrx/employee-user-links", "POST", {
    link_id: "link-a",
    employee_id: "emp-a",
    user_id: "iam-user-a",
  });
  assert.equal(linked.status, 201);
  const duplicate = runtimeRequest(context, "/api/hrx/employee-user-links", "POST", {
    link_id: "link-b",
    employee_id: "emp-b",
    user_id: "iam-user-a",
  });
  assert.equal(duplicate.status, 409);
  assert.equal(duplicate.body.safe_error_code, "HRX_EMPLOYEE_USER_LINK_DUPLICATE");
  const unknown = runtimeRequest(context, "/api/hrx/employee-user-links", "POST", {
    link_id: "link-unknown",
    employee_id: "emp-b",
    user_id: "iam-user-unknown",
  });
  assert.equal(unknown.status, 400);
  assert.equal(unknown.body.safe_error_code, "HRX_EMPLOYEE_USER_LINK_USER_INVALID");
  const disabled = runtimeRequest(context, "/api/hrx/employee-user-links", "POST", {
    link_id: "link-disabled",
    employee_id: "emp-b",
    user_id: "iam-user-disabled",
  });
  assert.equal(disabled.status, 400);
  assert.equal(disabled.body.safe_error_code, "HRX_EMPLOYEE_USER_LINK_USER_INVALID");
  const crossTenant = runtimeRequest(context, "/api/hrx/employee-user-links", "POST", {
    link_id: "link-cross-tenant",
    employee_id: "emp-b",
    user_id: "iam-user-cross-tenant",
  });
  assert.equal(crossTenant.status, 400);
  assert.equal(crossTenant.body.safe_error_code, "HRX_EMPLOYEE_USER_LINK_USER_INVALID");
  const loginUnknown = runtimeRequest(context, "/api/hrx/employee-user-links", "POST", {
    link_id: "link-login-unknown",
    employee_id: "emp-b",
    user_id: "iam-user-login-unknown",
  });
  assert.equal(loginUnknown.status, 400);
  assert.equal(loginUnknown.body.safe_error_code, "HRX_EMPLOYEE_USER_LINK_USER_INVALID");

  const candidates = runtimeRequest(
    context,
    "/api/hrx/employee-user-links",
    "GET",
    {},
    { employee_id: "emp-b" },
  ).body.candidates;
  assert.deepEqual(
    candidates.map((candidate) => candidate.account_label),
    ["이보람 · boram@example.test", "표시 가능한 이름", "reviewer@example.test"],
  );
  assert.equal(
    candidates.some((candidate) => (
      /iam-user/.test(candidate.account_label)
      || candidate.account_label.includes(candidate.user_id)
    )),
    false,
  );

  const readOnly = handleHrxApiRequest({
    pathname: "/api/hrx/employee-user-links",
    method: "GET",
    query: { employee_id: "emp-b" },
    context,
    matterContext: {
      userDirectory: {
        listUsers: () => [{
          tenant_id: RUNTIME_TENANT,
          user_id: "iam-user-b",
          display_name: "이보람",
          email: "boram@example.test",
          status: "active",
          login_allowed: true,
        }],
      },
    },
    requestContext: {
      ...RUNTIME_ACTOR,
      hrx_scopes: ["hrx.employee.read"],
    },
  });
  assert.deepEqual(readOnly.body.candidates, []);
  assert.equal(readOnly.body.can_manage, false);

  const revoked = runtimeRequest(context, "/api/hrx/employee-user-links/link-a/revoke", "POST");
  assert.equal(revoked.status, 200);
  assert.equal(runtimeRequest(
    context,
    "/api/hrx/employee-user-links",
    "GET",
    {},
    { employee_id: "emp-a" },
  ).body.links.length, 0);
  assert.ok(
    context.audit.list({ tenant_id: RUNTIME_TENANT }).some(
      (event) => event.action === "hrx.employee_user_link.revoke" && event.object_id === "link-a",
    ),
  );
});

test("HRX runtime employee user-link candidates fail closed for opaque labels while preserving human names", () => {
  const context = employeeManagementRuntime();
  const directoryUsers = [
    {
      tenant_id: RUNTIME_TENANT,
      user_id: "directory-user-uuid",
      display_name: "550e8400-e29b-41d4-a716-446655440000",
      source_title: "opaque-title_9F92A1B0",
      email: "uuid-account@example.test",
      status: "active",
      login_allowed: true,
    },
    {
      tenant_id: RUNTIME_TENANT,
      user_id: "directory-user-hex",
      display_name: "0123456789abcdef0123456789abcdef",
      email: "hex-account@example.test",
      status: "active",
      login_allowed: true,
    },
    {
      tenant_id: RUNTIME_TENANT,
      user_id: "directory-user-email",
      display_name: "directory@example.test",
      email: "email-account@example.test",
      status: "active",
      login_allowed: true,
    },
    {
      tenant_id: RUNTIME_TENANT,
      user_id: "directory-user-opaque",
      display_name: "opaque_7F92A1B0",
      email: "opaque-account@example.test",
      status: "active",
      login_allowed: true,
    },
    {
      tenant_id: RUNTIME_TENANT,
      user_id: "current-user-id",
      display_name: "current-user-id",
      email: "current-id-account@example.test",
      status: "active",
      login_allowed: true,
    },
    {
      tenant_id: RUNTIME_TENANT,
      user_id: "current-user-id-embedded",
      display_name: "계정 current-user-id-embedded",
      email: "current-embedded-account@example.test",
      status: "active",
      login_allowed: true,
    },
    {
      tenant_id: RUNTIME_TENANT,
      user_id: "directory-user-korean",
      display_name: "김민",
      source_title: "파트너 변호사",
      email: "min@example.test",
      status: "active",
      login_allowed: true,
    },
    {
      tenant_id: RUNTIME_TENANT,
      user_id: "directory-user-english",
      display_name: "Leena Kim",
      source_title: "Senior Counsel",
      email: "leena@example.test",
      status: "active",
      login_allowed: true,
    },
  ];
  const result = handleHrxApiRequest({
    pathname: "/api/hrx/employee-user-links",
    method: "GET",
    query: { employee_id: "emp-b" },
    context,
    matterContext: { userDirectory: { listUsers: () => directoryUsers } },
    requestContext: RUNTIME_ACTOR,
  });

  assert.equal(result.status, 200);
  const candidatesByUserId = new Map(result.body.candidates.map((candidate) => [candidate.user_id, candidate]));
  const publicLabels = result.body.candidates.map((candidate) => candidate.account_label).join(" | ");
  for (const unsafeLabel of [
    "550e8400-e29b-41d4-a716-446655440000",
    "0123456789abcdef0123456789abcdef",
    "directory@example.test",
    "opaque_7F92A1B0",
    "current-user-id",
    "current-user-id-embedded",
  ]) {
    assert.equal(publicLabels.includes(unsafeLabel), false, unsafeLabel);
  }

  for (const [userId, expectedEmail] of [
    ["directory-user-uuid", "uuid-account@example.test"],
    ["directory-user-hex", "hex-account@example.test"],
    ["directory-user-email", "email-account@example.test"],
    ["directory-user-opaque", "opaque-account@example.test"],
    ["current-user-id", "current-id-account@example.test"],
    ["current-user-id-embedded", "current-embedded-account@example.test"],
  ]) {
    assert.equal(candidatesByUserId.get(userId).display_name, null, userId);
    assert.equal(candidatesByUserId.get(userId).account_label, expectedEmail, userId);
  }
  assert.equal(candidatesByUserId.get("directory-user-uuid").title, null);
  assert.equal(candidatesByUserId.get("directory-user-korean").account_label, "김민 · min@example.test");
  assert.equal(candidatesByUserId.get("directory-user-english").account_label, "Leena Kim · leena@example.test");
  assert.equal(candidatesByUserId.get("directory-user-korean").title, "파트너 변호사");
  assert.equal(candidatesByUserId.get("directory-user-english").title, "Senior Counsel");
});

test("HRX runtime organization changes remain scheduled until their effective date and reject cycles", () => {
  const context = employeeManagementRuntime();
  const first = runtimeRequest(context, "/api/hrx/org-chart/employees/emp-a", "PATCH", {
    org_unit_id: "group_firm_leadership",
    manager_employee_id: "emp-b",
    effective_from: "2026-08-01",
  });
  assert.equal(first.status, 200);
  assert.equal(first.body.org_chart.employees.find((row) => row.employee_id === "emp-a").org_unit_id, "group_litigation");
  assert.equal(first.body.org_chart.scheduled_changes.length, 1);

  const after = runtimeRequest(
    context,
    "/api/hrx/org-chart",
    "GET",
    {},
    { as_of: "2026-08-01" },
  );
  const employeeAfter = after.body.employees.find((row) => row.employee_id === "emp-a");
  assert.equal(employeeAfter.org_unit_id, "group_firm_leadership");
  assert.equal(employeeAfter.manager_employee_id, "emp-b");

  const cycle = runtimeRequest(context, "/api/hrx/org-chart/employees/emp-b", "PATCH", {
    org_unit_id: "group_firm_leadership",
    manager_employee_id: "emp-a",
    effective_from: "2026-08-01",
  });
  assert.equal(cycle.status, 400);
  assert.equal(cycle.body.safe_error_code, "HRX_ORG_REPORTING_LINE_CYCLE");
});
