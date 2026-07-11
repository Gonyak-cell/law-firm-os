import assert from "node:assert/strict";
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import { startApiServer } from "../src/server.js";
import { findRegisteredAccountByUserId } from "../src/matter-vault-account-registry.js";
import { createSqlHrxRepository } from "../../../packages/hrx/src/repository-sql.js";
import { runHrxMigrations } from "../../../packages/hrx/src/migrations/index.js";
import { createFileHrxStore } from "../../../packages/hrx/src/store/file-store.js";
import { reconcileHrxMemberRosterStore } from "../src/hrx-runtime-context.js";
import {
  HRX_MEMBER_ROSTER_SOURCE_REF,
  listHrxMemberRosterRows,
} from "../src/hrx-member-roster-registry.js";
import { apiSessionHeaders } from "./helpers/session.js";
import { signedStepUpHeader } from "./hrx-step-up-test-helper.js";

let server;
let baseUrl;
let sessionHeaders;

const HRX_AUTH_HEADERS = Object.freeze({
  "x-lawos-tenant-id": "tenant_amic_matter_vault",
  "x-lawos-actor-id": "user_amic_jwsuh",
  "x-lawos-actor-role": "security_admin,hr_admin,people_ops",
  "x-lawos-hrx-step-up": signedStepUpHeader({
    tenant_id: "tenant_amic_matter_vault",
    actor_id: "user_amic_jwsuh",
  }),
  "x-lawos-hrx-scopes": [
    "hrx.employee.read",
    "hrx.employee.write",
    "hrx.document.read",
    "hrx.document.write",
    "hrx.attendance.read",
    "hrx.attendance.write",
    "hrx.overtime.read",
    "hrx.overtime.write",
    "hrx.risk.read",
    "hrx.risk.write",
    "hrx.leave.read",
    "hrx.leave.write",
    "hrx.approval.read",
    "hrx.approval.write",
    "hrx.candidate.read",
    "hrx.candidate.write",
    "hrx.lifecycle.read",
    "hrx.lifecycle.write",
    "hrx.policy.read",
    "hrx.policy.write",
    "hrx.analytics.read",
    "hrx.audit.read",
    "hrx.compensation.read",
    "hrx.payroll.preview",
    "hrx.payroll.export",
  ].join(","),
});

async function sessionHeadersForActor(targetBaseUrl, actor_id = null) {
  if (!actor_id) return apiSessionHeaders(targetBaseUrl);
  const account = findRegisteredAccountByUserId(actor_id);
  assert.ok(account, `registered account for ${actor_id} should exist`);
  return apiSessionHeaders(targetBaseUrl, account);
}

async function hrxAdminHeaders(targetBaseUrl = baseUrl) {
  return { ...(await sessionHeadersForActor(targetBaseUrl)), ...HRX_AUTH_HEADERS };
}

async function hrxElevatedActorHeaders(actor_id, targetBaseUrl = baseUrl) {
  return {
    ...(await sessionHeadersForActor(targetBaseUrl, actor_id)),
    ...HRX_AUTH_HEADERS,
    "x-lawos-actor-id": actor_id,
    "x-lawos-hrx-step-up": signedStepUpHeader({
      tenant_id: "tenant_amic_matter_vault",
      actor_id,
    }),
  };
}

async function hrxSelfServiceHeaders(actor_id, targetBaseUrl = baseUrl) {
  return {
    ...(await sessionHeadersForActor(targetBaseUrl, actor_id)),
    "x-lawos-tenant-id": "tenant_amic_matter_vault",
    "x-lawos-actor-id": actor_id,
    "x-lawos-actor-role": "lawos_staff",
    "x-lawos-hrx-step-up": signedStepUpHeader({
      tenant_id: "tenant_amic_matter_vault",
      actor_id,
    }),
    "x-lawos-hrx-scopes": ["hrx.employee.read", "hrx.document.read", "hrx.attendance.read", "hrx.leave.read", "hrx.compensation.read"].join(","),
  };
}

async function json(path, options = {}) {
  const headers = path.startsWith("/api/hrx")
    ? { ...sessionHeaders, ...HRX_AUTH_HEADERS, ...(options.headers ?? {}) }
    : options.headers;
  const response = await fetch(`${baseUrl}${path}`, { ...options, headers });
  return { status: response.status, body: await response.json() };
}

test.before(async () => {
  const started = await startApiServer({ port: 0 });
  server = started.server;
  baseUrl = `http://${started.host}:${started.port}`;
  sessionHeaders = await sessionHeadersForActor(baseUrl);
});

test.after(() => new Promise((resolve) => server.close(resolve)));

test("HRX member roster source of truth preserves the registered AMIC and PETRA roster", () => {
  const roster = listHrxMemberRosterRows();
  assert.equal(roster.length, 10);
  assert.ok(roster.every((member) => member.source_ref === HRX_MEMBER_ROSTER_SOURCE_REF));
  const membersByName = new Map(roster.map((member) => [member.display_name, member]));
  assert.equal(membersByName.get("김양태")?.title, "대표이사");
  assert.equal(membersByName.get("김양태")?.professional_profile?.profile_kind, "cpa");
  assert.equal(membersByName.get("김양태")?.professional_profile?.qualifications?.includes("대한민국 공인회계사"), true);
  assert.equal(membersByName.get("김양태")?.professional_profile?.qualifications?.includes("대한민국 변호사"), false);
  assert.equal(membersByName.get("조우상")?.professional_profile?.profile_kind, "deal_advisor");
  assert.equal(membersByName.get("조우상")?.manager_employee_id, "emp_amic_ytkim");
  assert.equal(membersByName.get("박서영")?.manager_employee_id, "emp_amic_ytkim");
  assert.equal(membersByName.get("이예진")?.manager_employee_id, "emp_amic_tryoon");
  assert.deepEqual(
    ["박병준", "임영훈", "서지원", "조성민", "한제희"].map((displayName) => membersByName.get(displayName)?.professional_profile?.profile_kind),
    ["attorney", "attorney", "attorney", "attorney", "attorney"],
  );
  for (const displayName of ["박서영", "조우상", "김양태"]) {
    const member = membersByName.get(displayName);
    assert.equal(member?.affiliation, "PETRA BRIDGE PARTNERS");
    assert.equal(member?.department, "Finance");
    assert.equal(member?.organization_group, "PETRA BRIDGE PARTNERS");
  }
  for (const displayName of ["박병준", "조성민", "임영훈", "서지원", "한제희"]) {
    const member = membersByName.get(displayName);
    assert.equal(member?.affiliation, "AMIC Law");
    assert.equal(member?.department, "Legal");
    assert.equal(member?.organization_group, "AMIC Law");
  }
  assert.equal(membersByName.get("한제희")?.work_email, "jh731@amic.kr");
  assert.equal(membersByName.get("한제희")?.title, "고문변호사");
  assert.equal(membersByName.get("한제희")?.start_date, "2026-07-06");
  assert.equal(membersByName.get("한제희")?.professional_profile?.qualifications?.includes("대한민국 변호사"), true);
  assert.equal(membersByName.get("한제희")?.professional_profile?.qualifications?.includes("대한민국 공인회계사"), true);
  for (const displayName of ["윤태리", "이예진"]) {
    const member = membersByName.get(displayName);
    assert.equal(member?.affiliation, "AMIC Law");
    assert.equal(member?.department, "Staff");
    assert.equal(member?.organization_group, "Staff");
  }
});

test("GET /api/hrx/employees returns synthetic API-backed employee rows", async () => {
  const { status, body } = await json("/api/hrx/employees");
  assert.equal(status, 200);
  assert.equal(body.outcome, "ok");
  assert.equal(body.employees.length, 10);
  assert.equal(body.employees[0].tenant_id, "tenant_amic_matter_vault");
  assert.deepEqual(body.employees.map((employee) => employee.display_name), [
    "김양태",
    "박병준",
    "박서영",
    "서지원",
    "윤태리",
    "이예진",
    "임영훈",
    "조성민",
    "조우상",
    "한제희",
  ]);
  assert.ok(body.employees.every((employee) => employee.source_ref === HRX_MEMBER_ROSTER_SOURCE_REF));
  assert.ok(body.employees.some((employee) => employee.work_email === "jwsuh@amic.kr"));
  assert.ok(body.employees.some((employee) => employee.display_name === "김양태" && employee.title === "대표이사"));
  assert.ok(body.employees.some((employee) => employee.display_name === "이예진" && employee.title === "대리"));
  const employeesByName = new Map(body.employees.map((employee) => [employee.display_name, employee]));
  assert.equal(employeesByName.get("김양태")?.professional_profile?.profile_kind, "cpa");
  assert.equal(employeesByName.get("김양태")?.professional_profile?.qualifications?.includes("대한민국 공인회계사"), true);
  assert.equal(employeesByName.get("김양태")?.professional_profile?.qualifications?.includes("대한민국 변호사"), false);
  assert.equal(employeesByName.get("조우상")?.professional_profile?.profile_kind, "deal_advisor");
  assert.equal(employeesByName.get("조우상")?.manager_display_name, "김양태");
  assert.equal(employeesByName.get("박서영")?.manager_display_name, "김양태");
  assert.equal(employeesByName.get("이예진")?.manager_display_name, "윤태리");
  assert.deepEqual(
    ["박병준", "임영훈", "서지원", "조성민", "한제희"].map((displayName) => employeesByName.get(displayName)?.professional_profile?.profile_kind),
    ["attorney", "attorney", "attorney", "attorney", "attorney"],
  );
  for (const displayName of ["박서영", "조우상", "김양태"]) {
    assert.equal(employeesByName.get(displayName)?.affiliation, "PETRA BRIDGE PARTNERS");
    assert.equal(employeesByName.get(displayName)?.department, "Finance");
    assert.equal(employeesByName.get(displayName)?.organization_group, "PETRA BRIDGE PARTNERS");
  }
  for (const displayName of ["박병준", "조성민", "임영훈", "서지원", "한제희"]) {
    assert.equal(employeesByName.get(displayName)?.affiliation, "AMIC Law");
    assert.equal(employeesByName.get(displayName)?.department, "Legal");
    assert.equal(employeesByName.get(displayName)?.organization_group, "AMIC Law");
  }
  assert.equal(employeesByName.get("한제희")?.work_email, "jh731@amic.kr");
  assert.equal(employeesByName.get("한제희")?.title, "고문변호사");
  assert.equal(employeesByName.get("한제희")?.professional_profile?.qualifications?.includes("대한민국 변호사"), true);
  assert.equal(employeesByName.get("한제희")?.professional_profile?.qualifications?.includes("대한민국 공인회계사"), true);
  for (const displayName of ["윤태리", "이예진"]) {
    assert.equal(employeesByName.get(displayName)?.affiliation, "AMIC Law");
    assert.equal(employeesByName.get(displayName)?.department, "Staff");
    assert.equal(employeesByName.get(displayName)?.organization_group, "Staff");
  }
  assert.ok(body.employees.every((employee) => employee.country === "대한민국"));
});

test("GET PATCH /api/hrx/org-chart wires organization units and reporting lines from EmploymentProfile", async () => {
  const before = await json("/api/hrx/org-chart");
  assert.equal(before.status, 200);
  assert.equal(before.body.outcome, "ok");
  assert.equal(before.body.generated_from, "hrx_employment_profiles");
  assert.equal(before.body.claim_boundary.string_heuristics_used, false);
  assert.equal(before.body.employees.length, 10);
  assert.ok(before.body.org_units.some((unit) => unit.org_unit_id === "org_legal" && unit.member_count === 5));
  assert.ok(before.body.org_units.some((unit) => unit.org_unit_id === "org_finance" && unit.member_count === 3));
  const beforeById = new Map(before.body.employees.map((employee) => [employee.employee_id, employee]));
  assert.equal(beforeById.get("emp_amic_wsjo").manager_employee_id, "emp_amic_ytkim");
  assert.equal(beforeById.get("emp_amic_wsjo").manager_display_name, "김양태");
  assert.equal(beforeById.get("emp_amic_wsjo").direct_report_count, 0);
  assert.equal(beforeById.get("emp_amic_sypark").org_unit_id, "org_finance");
  assert.equal(beforeById.get("emp_amic_sypark").manager_employee_id, "emp_amic_ytkim");
  assert.equal(beforeById.get("emp_amic_sypark").manager_display_name, "김양태");
  assert.equal(beforeById.get("emp_amic_tryoon").manager_employee_id, null);
  assert.equal(beforeById.get("emp_amic_tryoon").manager_display_name, null);
  assert.equal(beforeById.get("emp_amic_tryoon").direct_report_count, 1);
  assert.equal(beforeById.get("emp_amic_yjlee").manager_employee_id, "emp_amic_tryoon");
  assert.equal(beforeById.get("emp_amic_yjlee").manager_display_name, "윤태리");

  const updated = await json("/api/hrx/org-chart/employees/emp_amic_yjlee", {
    method: "PATCH",
    body: JSON.stringify({
      org_unit_id: "org_legal",
      manager_employee_id: "emp_amic_jwsuh",
    }),
  });
  assert.equal(updated.status, 200);
  assert.equal(updated.body.outcome, "updated");
  assert.equal(updated.body.employment_profile.org_unit_id, "org_legal");
  assert.equal(updated.body.employment_profile.manager_employee_id, "emp_amic_jwsuh");
  const updatedEmployee = updated.body.org_chart.employees.find((employee) => employee.employee_id === "emp_amic_yjlee");
  assert.equal(updatedEmployee.manager_display_name, "서지원");
  assert.ok(updated.body.org_chart.change_events.some((event) => event.action === "hrx.organization.update"));

  const invalidSelfManager = await json("/api/hrx/org-chart/employees/emp_amic_yjlee", {
    method: "PATCH",
    body: JSON.stringify({ manager_employee_id: "emp_amic_yjlee" }),
  });
  assert.equal(invalidSelfManager.status, 400);
  assert.equal(invalidSelfManager.body.safe_error_code, "HRX_ORG_MANAGER_SELF_REFERENCE");
});

test("durable HRX seed reconciles stale Matter Vault account seed rows to the member roster source of truth", async () => {
  const store = createFileHrxStore({ filePath: join(mkdtempSync(join(tmpdir(), "hrx-roster-reconcile-")), "store.json") });
  runHrxMigrations(store);
  const repository = createSqlHrxRepository({ store, clock: () => "2026-06-19T00:00:00.000Z" });
  const member = listHrxMemberRosterRows().find((row) => row.display_name === "김양태");
  const parkSeoyoung = listHrxMemberRosterRows().find((row) => row.display_name === "박서영");
  assert.ok(member);
  assert.ok(parkSeoyoung);
  const tenant_id = "tenant_amic_matter_vault";
  const staleSourceRef = "matter-vault-user-registration-seed";
  const profile_id = `profile_${member.user_id.replace(/^user_/, "")}`;
  repository.createEmployee({
    tenant_id,
    employee_id: member.employee_id,
    display_name: member.display_name,
    legal_name: member.legal_name,
    work_email: member.work_email,
    status: "active",
    source_ref: staleSourceRef,
  });
  repository.createEmploymentProfile({
    tenant_id,
    profile_id,
    employee_id: member.employee_id,
    employment_type: "full_time",
    status: "active",
    title: "대표",
    org_unit_id: "group_matter_vault_users",
    effective_from: "2026-06-22",
    source_ref: staleSourceRef,
  });
  const parkProfileId = `profile_${parkSeoyoung.user_id.replace(/^user_/, "")}`;
  repository.createEmployee({
    tenant_id,
    employee_id: parkSeoyoung.employee_id,
    display_name: parkSeoyoung.display_name,
    legal_name: parkSeoyoung.legal_name,
    work_email: parkSeoyoung.work_email,
    status: "active",
    source_ref: staleSourceRef,
  });
  repository.createEmploymentProfile({
    tenant_id,
    profile_id: parkProfileId,
    employee_id: parkSeoyoung.employee_id,
    employment_type: "full_time",
    status: "active",
    title: parkSeoyoung.title,
    org_unit_id: parkSeoyoung.org_unit_id,
    manager_employee_id: member.employee_id,
    effective_from: "2026-06-22",
    source_ref: staleSourceRef,
  });

  const started = await startApiServer({ port: 0, hrxStore: store });
  const localBaseUrl = `http://${started.host}:${started.port}`;
  try {
    const response = await fetch(`${localBaseUrl}/api/hrx/employees`, {
      headers: await hrxAdminHeaders(localBaseUrl),
    });
    const body = await response.json();
    assert.equal(response.status, 200);
    const kimYangTae = body.employees.find((employee) => employee.display_name === "김양태");
    assert.equal(kimYangTae.source_ref, HRX_MEMBER_ROSTER_SOURCE_REF);
    assert.equal(kimYangTae.title, "대표이사");
    assert.equal(kimYangTae.affiliation, "PETRA BRIDGE PARTNERS");
    assert.equal(kimYangTae.department, "Finance");
    assert.equal(kimYangTae.organization_group, "PETRA BRIDGE PARTNERS");

    const storedEmployee = repository.getEmployee({ tenant_id, employee_id: member.employee_id });
    assert.equal(storedEmployee.source_ref, HRX_MEMBER_ROSTER_SOURCE_REF);
    const storedProfile = repository.getEmploymentProfile({ tenant_id, profile_id });
    assert.equal(storedProfile.source_ref, HRX_MEMBER_ROSTER_SOURCE_REF);
    assert.equal(storedProfile.title, "대표이사");
    assert.equal(storedProfile.org_unit_id, member.org_unit_id);
    const storedParkProfile = repository.getEmploymentProfile({ tenant_id, profile_id: parkProfileId });
    assert.equal(storedParkProfile.source_ref, `${HRX_MEMBER_ROSTER_SOURCE_REF}:manager:emp_amic_sypark:emp_amic_ytkim`);
    assert.equal(storedParkProfile.manager_employee_id, "emp_amic_ytkim");
  } finally {
    await new Promise((resolve) => started.server.close(resolve));
  }

  repository.updateEmploymentProfile(
    { tenant_id, profile_id: parkProfileId },
    { manager_employee_id: "emp_amic_wsjo", effective_to: "2026-12-31" },
  );
  const repeated = reconcileHrxMemberRosterStore(store, { tenant_id });
  assert.equal(repeated.employment_profiles_reconciled, 0);
  const restarted = await startApiServer({ port: 0, hrxStore: store });
  try {
    const editedParkProfile = repository.getEmploymentProfile({ tenant_id, profile_id: parkProfileId });
    assert.equal(editedParkProfile.source_ref, `${HRX_MEMBER_ROSTER_SOURCE_REF}:manager:emp_amic_sypark:emp_amic_ytkim`);
    assert.equal(editedParkProfile.manager_employee_id, "emp_amic_wsjo");
    assert.equal(editedParkProfile.effective_to, "2026-12-31");
  } finally {
    await new Promise((resolve) => restarted.server.close(resolve));
  }
});

test("GET /api/hrx/employees/:id returns profile with compensation masked", async () => {
  const { status, body } = await json("/api/hrx/employees/emp_amic_ytkim");
  assert.equal(status, 200);
  assert.equal(body.employee.employee_id, "emp_amic_ytkim");
  assert.equal(body.employee.affiliation, "PETRA BRIDGE PARTNERS");
  assert.equal(body.employee.department, "Finance");
  assert.equal(body.employee.organization_group, "PETRA BRIDGE PARTNERS");
  assert.equal(body.employee.professional_profile.profile_kind, "cpa");
  assert.equal(body.professional_profile.profile_kind, "cpa");
  assert.equal(body.professional_profile.qualifications.includes("대한민국 공인회계사"), true);
  assert.equal(body.professional_profile.qualifications.includes("대한민국 변호사"), false);
  assert.equal(body.employment_profile.employee_id, "emp_amic_ytkim");
  assert.match(body.masked_compensation_ref, /^compensation_ref_hash:[a-f0-9]{24}$/);
  assert.equal(body.masked_compensation_ref.includes("local-kms://"), false);
  assert.equal(Object.hasOwn(body, "salary"), false);
});

test("GET /api/hrx/compensation requires step-up and returns masked ref-only records for self and elevated readers", async () => {
  const challenged = await json("/api/hrx/compensation?employee_id=emp_amic_ytkim", {
    headers: {
      ...HRX_AUTH_HEADERS,
      "x-lawos-hrx-step-up": "",
    },
  });
  assert.equal(challenged.status, 403);
  assert.equal(challenged.body.safe_error_code, "HRX_STEP_UP_REQUIRED");

  const self = await json("/api/hrx/compensation?employee_id=emp_amic_ytkim", {
    headers: await hrxSelfServiceHeaders("user_amic_ytkim"),
  });
  assert.equal(self.status, 200);
  assert.equal(self.body.outcome, "ok");
  assert.match(self.body.masked_compensation_ref, /^compensation_ref_hash:[a-f0-9]{24}$/);
  assert.equal(self.body.masked_compensation_ref.includes("local-kms://"), false);
  assert.equal(self.body.compensation_records[0].employment_contract_id, "contract-doc-003");
  assert.equal(self.body.compensation_records[0].contract_document_ref, "DMS:employment-contract-003");
  assert.equal(self.body.compensation_records[0].raw_amount_included, false);
  assert.equal(Object.hasOwn(self.body.compensation_records[0], "encrypted_amount_ref"), false);
  assert.equal(JSON.stringify(self.body).includes("salary"), false);

  const otherDenied = await json("/api/hrx/compensation?employee_id=emp_amic_ytkim", {
    headers: await hrxSelfServiceHeaders("user_amic_bj_park"),
  });
  assert.equal(otherDenied.status, 403);
  assert.equal(otherDenied.body.safe_error_code, "HRX_AUTHZ_DENIED");
  assert.equal(otherDenied.body.required_scope, "hrx.compensation.read");

  const elevated = await json("/api/hrx/compensation?employee_id=emp_amic_ytkim");
  assert.equal(elevated.status, 200);
  assert.equal(elevated.body.compensation_records.length, 1);
  const audit = await json("/api/hrx/audit");
  assert.ok(audit.body.events.some((event) => event.action === "hrx.compensation.read" && event.object_id === "emp_amic_ytkim"));
});

test("POST PATCH /api/hrx/employees registers employees and enforces the 6-state lifecycle", async () => {
  const created = await json("/api/hrx/employees", {
    method: "POST",
    body: JSON.stringify({
      employee_id: "emp_api_lifecycle_001",
      display_name: "Lifecycle Employee",
      legal_name: "Lifecycle Employee",
      work_email: "lifecycle.employee@example.test",
    }),
  });
  assert.equal(created.status, 201);
  assert.equal(created.body.employee.status, "onboarding");

  const probation = await json("/api/hrx/employees/emp_api_lifecycle_001", {
    method: "PATCH",
    body: JSON.stringify({ status: "probation" }),
  });
  assert.equal(probation.status, 200);
  assert.equal(probation.body.employee.status, "probation");

  const active = await json("/api/hrx/employees/emp_api_lifecycle_001", {
    method: "PATCH",
    body: JSON.stringify({ status: "active" }),
  });
  assert.equal(active.status, 200);
  assert.equal(active.body.employee.status, "active");

  const invalidStatus = await json("/api/hrx/employees/emp_api_lifecycle_001", {
    method: "PATCH",
    body: JSON.stringify({ status: "paused" }),
  });
  assert.equal(invalidStatus.status, 400);
  assert.equal(invalidStatus.body.safe_error_code, "HRX_API_VALIDATION_ERROR");
  assert.match(invalidStatus.body.reason, /Employee status must be one of/);

  const invalidTransition = await json("/api/hrx/employees/emp_api_lifecycle_001", {
    method: "PATCH",
    body: JSON.stringify({ status: "onboarding" }),
  });
  assert.equal(invalidTransition.status, 400);
  assert.equal(invalidTransition.body.safe_error_code, "HRX_API_VALIDATION_ERROR");
  assert.match(invalidTransition.body.reason, /cannot transition from active to onboarding/);

  const detail = await json("/api/hrx/employees/emp_api_lifecycle_001");
  assert.equal(detail.status, 200);
  assert.equal(detail.body.employee.status, "active");

  const audit = await json("/api/hrx/audit");
  assert.ok(audit.body.events.some((event) => event.action === "hrx.employee.create" && event.object_id === "emp_api_lifecycle_001"));
  assert.ok(audit.body.events.some((event) => event.action === "hrx.employee.update" && event.object_id === "emp_api_lifecycle_001"));
});

test("employee registration and status survive HRX API server restart", async () => {
  const storeFile = join(mkdtempSync(join(tmpdir(), "hrx-api-employee-lifecycle-")), "store.json");
  const store = createFileHrxStore({ filePath: storeFile });
  runHrxMigrations(store);
  const first = await startApiServer({ port: 0, hrxStore: store });
  const firstBaseUrl = `http://${first.host}:${first.port}`;
  try {
    const firstHeaders = await hrxAdminHeaders(firstBaseUrl);
    const created = await fetch(`${firstBaseUrl}/api/hrx/employees`, {
      method: "POST",
      headers: firstHeaders,
      body: JSON.stringify({
        employee_id: "emp_api_restart_001",
        display_name: "Restart Proof Employee",
        work_email: "restart.employee@example.test",
      }),
    });
    const createdBody = await created.json();
    assert.equal(created.status, 201);
    assert.equal(createdBody.employee.status, "onboarding");

    const active = await fetch(`${firstBaseUrl}/api/hrx/employees/emp_api_restart_001`, {
      method: "PATCH",
      headers: firstHeaders,
      body: JSON.stringify({ status: "probation" }),
    });
    const activeBody = await active.json();
    assert.equal(active.status, 200);
    assert.equal(activeBody.employee.status, "probation");
  } finally {
    await new Promise((resolve) => first.server.close(resolve));
    store.close();
  }

  const reopenedStore = createFileHrxStore({ filePath: storeFile });
  const second = await startApiServer({ port: 0, hrxStore: reopenedStore });
  const secondBaseUrl = `http://${second.host}:${second.port}`;
  try {
    const secondHeaders = await hrxAdminHeaders(secondBaseUrl);
    const detail = await fetch(`${secondBaseUrl}/api/hrx/employees/emp_api_restart_001`, {
      headers: secondHeaders,
    });
    const detailBody = await detail.json();
    assert.equal(detail.status, 200);
    assert.equal(detailBody.employee.display_name, "Restart Proof Employee");
    assert.equal(detailBody.employee.status, "probation");
  } finally {
    await new Promise((resolve) => second.server.close(resolve));
    reopenedStore.close();
  }
});

test("HRX self-service reads are bound to EmployeeUserLink ownership", async () => {
  const ownEmployeeId = "emp_amic_yjlee";
  const otherEmployeeId = "emp_amic_wsjo";
  const selfHeaders = await hrxSelfServiceHeaders("user_amic_yjlee");

  const list = await json("/api/hrx/employees", { headers: selfHeaders });
  assert.equal(list.status, 200);
  assert.deepEqual(list.body.employees.map((employee) => employee.employee_id), [ownEmployeeId]);
  assert.equal(list.body.permission_summary.self_service_filtered, true);

  const ownEmployee = await json(`/api/hrx/employees/${ownEmployeeId}`, { headers: selfHeaders });
  assert.equal(ownEmployee.status, 200);
  assert.equal(ownEmployee.body.employee.employee_id, ownEmployeeId);

  const otherEmployee = await json(`/api/hrx/employees/${otherEmployeeId}`, { headers: selfHeaders });
  assert.equal(otherEmployee.status, 403);
  assert.equal(otherEmployee.body.safe_error_code, "HRX_SELF_SERVICE_SCOPE_DENIED");
  assert.equal(otherEmployee.body.employee, null);

  const ownDocuments = await json(`/api/hrx/documents?employee_id=${ownEmployeeId}`, { headers: selfHeaders });
  assert.equal(ownDocuments.status, 200);
  assert.ok(ownDocuments.body.documents.every((document) => document.employee_id === ownEmployeeId));

  const otherDocuments = await json(`/api/hrx/documents?employee_id=${otherEmployeeId}`, { headers: selfHeaders });
  assert.equal(otherDocuments.status, 403);
  assert.equal(otherDocuments.body.safe_error_code, "HRX_SELF_SERVICE_SCOPE_DENIED");
  assert.deepEqual(otherDocuments.body.documents, []);

  const ownAttendance = await json(`/api/hrx/attendance?employee_id=${ownEmployeeId}&month=2026-07`, { headers: selfHeaders });
  assert.equal(ownAttendance.status, 403);
  assert.equal(ownAttendance.body.safe_error_code, "HRX_AUTHZ_DENIED");
  assert.equal(ownAttendance.body.required_scope, "hrx.attendance.read");

  const otherAttendance = await json(`/api/hrx/attendance?employee_id=${otherEmployeeId}&month=2026-07`, { headers: selfHeaders });
  assert.equal(otherAttendance.status, 403);
  assert.equal(otherAttendance.body.safe_error_code, "HRX_AUTHZ_DENIED");
  assert.equal(otherAttendance.body.required_scope, "hrx.attendance.read");

  const ownLeave = await json(`/api/hrx/leave?employee_id=${ownEmployeeId}&policy_id=pto-us`, { headers: selfHeaders });
  assert.equal(ownLeave.status, 200);
  assert.equal(ownLeave.body.balance.employee_id, ownEmployeeId);

  const otherLeave = await json(`/api/hrx/leave?employee_id=${otherEmployeeId}&policy_id=pto-us`, { headers: selfHeaders });
  assert.equal(otherLeave.status, 403);
  assert.equal(otherLeave.body.safe_error_code, "HRX_SELF_SERVICE_SCOPE_DENIED");
  assert.equal(otherLeave.body.balance, null);
  assert.deepEqual(otherLeave.body.requests, []);
});

test("GET POST revoke /api/hrx/employee-user-links manages audited login mappings", async () => {
  const before = await json("/api/hrx/employee-user-links?employee_id=emp_amic_ytkim");
  assert.equal(before.status, 200);
  assert.ok(before.body.links.some((link) => link.link_id === "link_amic_ytkim" && link.user_id === "user_amic_ytkim"));

  const created = await json("/api/hrx/employee-user-links", {
    method: "POST",
    body: JSON.stringify({
      link_id: "link-api-001",
      employee_id: "emp_amic_wsjo",
      user_id: "iam-user-api-001",
    }),
  });
  assert.equal(created.status, 201);
  assert.equal(created.body.link.purpose, "login_mapping");

  const revoked = await json("/api/hrx/employee-user-links/link-api-001/revoke", {
    method: "POST",
    body: JSON.stringify({ reason: "test cleanup" }),
  });
  assert.equal(revoked.status, 200);
  assert.equal(revoked.body.revoked, true);

  const audit = await json("/api/hrx/audit");
  assert.ok(audit.body.events.some((event) => event.action === "hrx.employee_user_link.create"));
  assert.ok(audit.body.events.some((event) => event.action === "hrx.employee_user_link.revoke"));
});

test("GET POST correct /api/hrx/attendance records time and monthly effective summary", async () => {
  const employee = await json("/api/hrx/employees", {
    method: "POST",
    body: JSON.stringify({
      employee_id: "emp_api_attendance_001",
      display_name: "Attendance API Employee",
      work_email: "attendance.api@example.test",
    }),
  });
  assert.equal(employee.status, 201);

  const created = await json("/api/hrx/attendance", {
    method: "POST",
    body: JSON.stringify({
      attendance_id: "att-api-001",
      employee_id: "emp_api_attendance_001",
      work_date: "2026-07-02",
      status: "present",
      recorded_hours: 8,
      clock_in_at: "2026-07-02T00:00:00.000Z",
      clock_out_at: "2026-07-02T09:00:00.000Z",
      source_ref: "TimeClock:api:att-api-001",
    }),
  });
  assert.equal(created.status, 201);
  assert.equal(created.body.attendance.source_ref, "TimeClock:api:att-api-001");

  const corrected = await json("/api/hrx/attendance/att-api-001/correct", {
    method: "POST",
    body: JSON.stringify({
      attendance_id: "att-api-001-correction",
      status: "remote",
      recorded_hours: 7.5,
      source_ref: "TimeClock:api:att-api-001-correction",
      correction_reason: "manager correction",
    }),
  });
  assert.equal(corrected.status, 200);
  assert.equal(corrected.body.attendance.correction_of_attendance_id, "att-api-001");

  const listed = await json("/api/hrx/attendance?employee_id=emp_api_attendance_001&month=2026-07");
  assert.equal(listed.status, 200);
  assert.equal(listed.body.attendance.length, 2);
  assert.equal(listed.body.monthly_summary.record_count, 2);
  assert.equal(listed.body.monthly_summary.effective_record_count, 1);
  assert.equal(listed.body.monthly_summary.correction_count, 1);
  assert.equal(listed.body.monthly_summary.total_recorded_hours, 7.5);
  assert.equal(listed.body.monthly_summary.by_status.remote, 1);

  const audit = await json("/api/hrx/audit");
  assert.ok(audit.body.events.some((event) => event.action === "hrx.attendance.write" && event.object_id === "att-api-001"));
  assert.ok(audit.body.events.some((event) => event.action === "hrx.attendance.correct" && event.object_id === "att-api-001-correction"));
  assert.ok(audit.body.events.some((event) => event.action === "hrx.attendance.read" && event.object_id === "emp_api_attendance_001"));
});

test("attendance records survive HRX API server restart", async () => {
  const storeFile = join(mkdtempSync(join(tmpdir(), "hrx-api-attendance-")), "store.json");
  const store = createFileHrxStore({ filePath: storeFile });
  runHrxMigrations(store);
  const first = await startApiServer({ port: 0, hrxStore: store });
  const firstBaseUrl = `http://${first.host}:${first.port}`;
  try {
    const firstHeaders = await hrxAdminHeaders(firstBaseUrl);
    const employee = await fetch(`${firstBaseUrl}/api/hrx/employees`, {
      method: "POST",
      headers: firstHeaders,
      body: JSON.stringify({
        employee_id: "emp_api_attendance_restart_001",
        display_name: "Restart Attendance Employee",
        work_email: "restart.attendance@example.test",
      }),
    });
    assert.equal(employee.status, 201);

    const created = await fetch(`${firstBaseUrl}/api/hrx/attendance`, {
      method: "POST",
      headers: firstHeaders,
      body: JSON.stringify({
        attendance_id: "att-api-restart-001",
        employee_id: "emp_api_attendance_restart_001",
        work_date: "2026-07-03",
        status: "present",
        recorded_hours: 8,
        source_ref: "TimeClock:api:att-api-restart-001",
      }),
    });
    const createdBody = await created.json();
    assert.equal(created.status, 201);
    assert.equal(createdBody.attendance.attendance_id, "att-api-restart-001");
  } finally {
    await new Promise((resolve) => first.server.close(resolve));
    store.close();
  }

  const reopenedStore = createFileHrxStore({ filePath: storeFile });
  const second = await startApiServer({ port: 0, hrxStore: reopenedStore });
  const secondBaseUrl = `http://${second.host}:${second.port}`;
  try {
    const secondHeaders = await hrxAdminHeaders(secondBaseUrl);
    const listed = await fetch(
      `${secondBaseUrl}/api/hrx/attendance?employee_id=emp_api_attendance_restart_001&month=2026-07`,
      { headers: secondHeaders },
    );
    const listedBody = await listed.json();
    assert.equal(listed.status, 200);
    assert.equal(listedBody.attendance.length, 1);
    assert.equal(listedBody.attendance[0].attendance_id, "att-api-restart-001");
    assert.equal(listedBody.monthly_summary.total_recorded_hours, 8);
  } finally {
    await new Promise((resolve) => second.server.close(resolve));
    reopenedStore.close();
  }
});

test("GET POST approve /api/hrx/overtime detects unapproved excess and weekly 52-hour risks", async () => {
  const employee = await json("/api/hrx/employees", {
    method: "POST",
    body: JSON.stringify({
      employee_id: "emp_api_overtime_001",
      display_name: "Overtime API Employee",
      work_email: "overtime.api@example.test",
    }),
  });
  assert.equal(employee.status, 201);

  const attendanceRows = [
    ["2026-07-06", 12],
    ["2026-07-07", 12],
    ["2026-07-08", 12],
    ["2026-07-09", 12],
    ["2026-07-10", 8],
  ];
  for (const [work_date, recorded_hours] of attendanceRows) {
    const created = await json("/api/hrx/attendance", {
      method: "POST",
      body: JSON.stringify({
        attendance_id: `att-overtime-${work_date}`,
        employee_id: "emp_api_overtime_001",
        work_date,
        status: "present",
        recorded_hours,
        source_ref: `TimeClock:api:overtime:${work_date}`,
      }),
    });
    assert.equal(created.status, 201);
  }

  const submitted = await json("/api/hrx/overtime", {
    method: "POST",
    body: JSON.stringify({
      overtime_id: "ot-api-001",
      employee_id: "emp_api_overtime_001",
      work_date: "2026-07-06",
      hours: 4,
      reason: "urgent filing support",
    }),
  });
  assert.equal(submitted.status, 201);
  assert.equal(submitted.body.overtime.state, "submitted");

  const approved = await json("/api/hrx/overtime/ot-api-001/approve", {
    method: "POST",
    body: JSON.stringify({ approver_id: "manager-api-001" }),
  });
  assert.equal(approved.status, 200);
  assert.equal(approved.body.overtime.state, "approved");

  const listed = await json("/api/hrx/overtime?employee_id=emp_api_overtime_001&month=2026-07");
  assert.equal(listed.status, 200);
  assert.equal(listed.body.overtime.length, 1);
  assert.equal(listed.body.overtime[0].state, "approved");

  const risks = await json("/api/hrx/overtime/risks?employee_id=emp_api_overtime_001&month=2026-07");
  assert.equal(risks.status, 200);
  const events = risks.body.risk_report.events;
  assert.ok(events.some((event) => event.risk_type === "weekly_limit_exceeded" && event.excess_hours === 4));
  assert.deepEqual(
    events.filter((event) => event.risk_type === "unapproved_overtime_detected").map((event) => event.work_date).sort(),
    ["2026-07-07", "2026-07-08", "2026-07-09"],
  );

  const audit = await json("/api/hrx/audit");
  assert.ok(audit.body.events.some((event) => event.action === "hrx.overtime.submit" && event.object_id === "ot-api-001"));
  assert.ok(audit.body.events.some((event) => event.action === "hrx.overtime.approve" && event.object_id === "ot-api-001"));
  assert.ok(audit.body.events.some((event) => event.action === "hrx.overtime.risk.read" && event.object_id === "emp_api_overtime_001"));
});

test("POST GET transition /api/hrx/risks runs daily legal-risk scan and state machine", async () => {
  const scanned = await json("/api/hrx/risks/scan", {
    method: "POST",
    body: JSON.stringify({ as_of: "2026-07-03" }),
  });
  assert.equal(scanned.status, 200);
  assert.equal(scanned.body.outcome, "scanned");
  assert.equal(scanned.body.dashboard.legal_type_count, 5);
  const legalTypes = new Set(scanned.body.risk_events.map((event) => event.risk_type));
  for (const type of [
    "employment_contract_missing",
    "annual_leave_promotion_target",
    "statutory_training_missing",
    "overtime_risk",
    "offboarded_access_not_revoked",
  ]) {
    assert.equal(legalTypes.has(type), true, `${type} risk event missing`);
  }

  const listed = await json("/api/hrx/risks");
  assert.equal(listed.status, 200);
  assert.equal(listed.body.outcome, "ok");
  assert.equal(listed.body.dashboard.legal_type_count, 5);
  const contractRisk = listed.body.risk_events.find((event) => event.risk_type === "employment_contract_missing");
  assert.ok(contractRisk);

  const acknowledged = await json(`/api/hrx/risks/${encodeURIComponent(contractRisk.risk_event_id)}/transition`, {
    method: "POST",
    body: JSON.stringify({ status: "acknowledged", reason: "contract owner assigned" }),
  });
  assert.equal(acknowledged.status, 200);
  assert.equal(acknowledged.body.risk_event.status, "acknowledged");
  assert.equal(acknowledged.body.risk_event.state_history[0].from_status, "open");

  const blockedResolution = await json(`/api/hrx/risks/${encodeURIComponent(contractRisk.risk_event_id)}/transition`, {
    method: "POST",
    body: JSON.stringify({ status: "resolved" }),
  });
  assert.equal(blockedResolution.status, 400);
  assert.equal(blockedResolution.body.safe_error_code, "HRX_API_VALIDATION_ERROR");
  assert.match(blockedResolution.body.reason, /resolution_ref is required/);

  const resolved = await json(`/api/hrx/risks/${encodeURIComponent(contractRisk.risk_event_id)}/transition`, {
    method: "POST",
    body: JSON.stringify({ status: "resolved", resolution_ref: "DMS:employment-contract-d15:signed" }),
  });
  assert.equal(resolved.status, 200);
  assert.equal(resolved.body.risk_event.status, "resolved");
  assert.equal(resolved.body.risk_event.resolution_ref, "DMS:employment-contract-d15:signed");

  const audit = await json("/api/hrx/audit");
  assert.ok(audit.body.events.some((event) => event.action === "hrx.risk.scan"));
  assert.ok(audit.body.events.some((event) => event.action === "hrx.risk.read"));
  assert.ok(audit.body.events.some((event) => event.action === "hrx.risk.transition"));
});

test("GET /api/hrx/documents returns metadata source refs only", async () => {
  const { status, body } = await json("/api/hrx/documents?employee_id=emp_amic_ytkim");
  assert.equal(status, 200);
  assert.equal(body.documents[0].source_ref, "DMS:hr-policy-ack-001");
  assert.equal(body.documents[0].source_status, "verified");
  assert.equal(body.documents[0].source_provider, "dms");
  assert.equal(Object.hasOwn(body.documents[0], "body"), false);
});

test("POST sign expire /api/hrx/documents wires employment contract lifecycle and 30-day expiry", async () => {
  const created = await json("/api/hrx/documents", {
    method: "POST",
    body: JSON.stringify({
      document_id: "doc-api-contract-001",
      employee_id: "emp_amic_ytkim",
      title: "근로계약서 2026",
      source_ref: "DMS:employment-contract-api-001",
      contract_id: "contract-api-001",
      expires_on: "2026-07-25",
    }),
  });
  assert.equal(created.status, 201);
  assert.equal(created.body.document.document_type, "employment_contract");
  assert.equal(created.body.document.contract_state, "draft");
  assert.equal(created.body.document.document_body_included, false);

  const missingSignature = await json("/api/hrx/documents/doc-api-contract-001/sign", {
    method: "POST",
    body: JSON.stringify({}),
  });
  assert.equal(missingSignature.status, 400);
  assert.match(missingSignature.body.reason, /signature_ref is required/);

  const signed = await json("/api/hrx/documents/doc-api-contract-001/sign", {
    method: "POST",
    body: JSON.stringify({
      signature_ref: "DMS:employment-contract-api-001:signed",
      signed_at: "2026-07-02T00:00:00.000Z",
    }),
  });
  assert.equal(signed.status, 200);
  assert.equal(signed.body.document.contract_state, "signed");
  assert.equal(signed.body.document.signature_ref, "DMS:employment-contract-api-001:signed");

  const expiring = await json("/api/hrx/documents/expiring?as_of=2026-07-02&days=30");
  assert.equal(expiring.status, 200);
  assert.ok(expiring.body.documents.some((document) => document.document_id === "doc-api-contract-001"));
  assert.ok(expiring.body.documents.every((document) => Object.hasOwn(document, "body") === false));

  const expired = await json("/api/hrx/documents/doc-api-contract-001/expire", {
    method: "POST",
    body: JSON.stringify({ expired_at: "2026-07-26T00:00:00.000Z" }),
  });
  assert.equal(expired.status, 200);
  assert.equal(expired.body.document.contract_state, "expired");

  const afterExpiry = await json("/api/hrx/documents/expiring?employee_id=emp_amic_ytkim&as_of=2026-07-02&days=30");
  assert.equal(afterExpiry.status, 200);
  assert.ok(!afterExpiry.body.documents.some((document) => document.document_id === "doc-api-contract-001"));

  const renewalCandidate = await json("/api/hrx/documents", {
    method: "POST",
    body: JSON.stringify({
      document_id: "doc-api-contract-002",
      employee_id: "emp_amic_ytkim",
      title: "근로계약서 갱신",
      source_ref: "DMS:employment-contract-api-002",
      contract_id: "contract-api-002",
      expires_on: "2026-07-25",
    }),
  });
  assert.equal(renewalCandidate.status, 201);
  const signedRenewal = await json("/api/hrx/documents/doc-api-contract-002/sign", {
    method: "POST",
    body: JSON.stringify({
      signature_ref: "DMS:employment-contract-api-002:signed",
      signed_at: "2026-07-02T00:00:00.000Z",
    }),
  });
  assert.equal(signedRenewal.status, 200);
  const renewed = await json("/api/hrx/documents/doc-api-contract-002/renew", {
    method: "POST",
    body: JSON.stringify({ expires_on: "2026-08-25" }),
  });
  assert.equal(renewed.status, 200);
  assert.equal(renewed.body.document.contract_state, "renewed");
  assert.equal(renewed.body.document.expires_on, "2026-08-25");
  const terminated = await json("/api/hrx/documents/doc-api-contract-002/terminate", {
    method: "POST",
    body: JSON.stringify({}),
  });
  assert.equal(terminated.status, 200);
  assert.equal(terminated.body.document.contract_state, "terminated");
  const audit = await json("/api/hrx/audit");
  assert.ok(audit.body.events.some((event) => event.action === "hrx.document.metadata.create" && event.object_id === "doc-api-contract-001"));
  assert.ok(audit.body.events.some((event) => event.action === "hrx.document.contract.sign" && event.object_id === "doc-api-contract-001"));
  assert.ok(audit.body.events.some((event) => event.action === "hrx.document.contract.expire" && event.object_id === "doc-api-contract-001"));
  assert.ok(audit.body.events.some((event) => event.action === "hrx.document.contract.renew" && event.object_id === "doc-api-contract-002"));
  assert.ok(audit.body.events.some((event) => event.action === "hrx.document.contract.terminate" && event.object_id === "doc-api-contract-002"));
});

test("GET and POST /api/hrx/leave use leave request workflow state", async () => {
  const before = await json("/api/hrx/leave?employee_id=emp_amic_ytkim&policy_id=pto-us");
  assert.equal(before.status, 200);
  assert.equal(before.body.balance.available_balance, 80);

  const submitted = await json("/api/hrx/leave", {
    method: "POST",
    body: JSON.stringify({
      request_id: "leave-api-001",
      employee_id: "emp_amic_ytkim",
      policy_id: "pto-us",
      leave_type: "pto",
      amount: 8,
      start_date: "2026-07-01",
      end_date: "2026-07-01",
    }),
  });
  assert.equal(submitted.status, 201);
  assert.equal(submitted.body.leave_request.state, "submitted");

  const after = await json("/api/hrx/leave?employee_id=emp_amic_ytkim&policy_id=pto-us");
  assert.ok(after.body.requests.some((request) => request.request_id === "leave-api-001"));

  const approved = await json("/api/hrx/leave/leave-api-001/approve", {
    method: "POST",
    body: JSON.stringify({ decision_reason: "approved from leave page" }),
  });
  assert.equal(approved.status, 200);
  assert.equal(approved.body.leave_request.request_id, "leave-api-001");
  assert.equal(approved.body.leave_request.state, "approved");

  const afterApproval = await json("/api/hrx/leave?employee_id=emp_amic_ytkim&policy_id=pto-us");
  assert.equal(afterApproval.body.balance.available_balance, 72);
  assert.ok(afterApproval.body.requests.some((request) => request.request_id === "leave-api-001" && request.state === "approved"));
});

test("GET and POST /api/hrx/approvals resolves manager queue and records audit", async () => {
  const before = await json("/api/hrx/approvals");
  assert.equal(before.status, 200);
  assert.ok(before.body.approvals.some((approval) => approval.approval_id === "approval-leave-002" && approval.state === "approved"));
  assert.ok(before.body.approvals.some((approval) => approval.approval_id === "approval-leave-003" && approval.state === "pending"));
  assert.ok(before.body.approvals.some((approval) => approval.approval_id === "approval-leave-004" && approval.state === "pending"));

  const selfApproval = await json("/api/hrx/approvals/approval-leave-003/approve", {
    method: "POST",
    headers: await hrxElevatedActorHeaders("user_amic_ytkim"),
    body: JSON.stringify({ decision_reason: "self approval probe" }),
  });
  assert.equal(selfApproval.status, 403);
  assert.equal(selfApproval.body.safe_error_code, "HRX_LEAVE_SELF_APPROVAL_FORBIDDEN");

  const leaveBefore = await json("/api/hrx/leave?employee_id=emp_amic_ytkim&policy_id=pto-us");
  const balanceBeforeApproval = leaveBefore.body.balance.available_balance;

  const approved = await json("/api/hrx/approvals/approval-leave-003/approve", {
    method: "POST",
    body: JSON.stringify({ decision_reason: "approved by manager" }),
  });
  assert.equal(approved.status, 200);
  assert.equal(approved.body.approval.state, "approved");
  assert.equal(approved.body.leave_request.request_id, "leave-003");
  assert.equal(approved.body.leave_request.state, "approved");

  const leaveAfter = await json("/api/hrx/leave?employee_id=emp_amic_ytkim&policy_id=pto-us");
  assert.equal(leaveAfter.body.balance.available_balance, balanceBeforeApproval - 8);
  assert.ok(leaveAfter.body.requests.some((request) => request.request_id === "leave-003" && request.state === "approved"));

  const rejected = await json("/api/hrx/approvals/approval-leave-004/reject", {
    method: "POST",
    body: JSON.stringify({ decision_reason: "coverage required" }),
  });
  assert.equal(rejected.status, 200);
  assert.equal(rejected.body.approval.state, "rejected");
  assert.equal(rejected.body.leave_request.request_id, "leave-004");
  assert.equal(rejected.body.leave_request.state, "rejected");

  const leaveAfterReject = await json("/api/hrx/leave?employee_id=emp_amic_ytkim&policy_id=pto-us");
  assert.equal(leaveAfterReject.body.balance.available_balance, balanceBeforeApproval - 8);

  const audit = await json("/api/hrx/audit");
  assert.ok(audit.body.events.some((event) => event.action === "hrx.approval.approve"));
  assert.ok(audit.body.events.some((event) => event.action === "hrx.leave.approve" && event.object_id === "leave-003"));
  assert.ok(audit.body.events.some((event) => event.action === "hrx.approval.reject" && event.object_id === "approval-leave-004"));
  assert.ok(audit.body.events.some((event) => event.action === "hrx.leave.reject" && event.object_id === "leave-004"));
});

test("GET /api/hrx/candidate/portal returns candidate-scoped application and metadata only", async () => {
  const { status, body } = await json("/api/hrx/candidate/portal?candidate_id=cand-001");
  assert.equal(status, 200);
  assert.equal(body.candidate.candidate_id, "cand-001");
  assert.equal(body.applications[0].candidate_id, "cand-001");
  assert.equal(body.documents[0].body_included, false);
  assert.equal(Object.hasOwn(body.candidate, "crm_party_id"), false);
});

test("GET and POST recruiting pipeline updates application stage through API", async () => {
  const before = await json("/api/hrx/recruiting/pipeline");
  assert.equal(before.status, 200);
  const app = before.body.applications.find((item) => item.application_id === "app-001");
  assert.equal(app.stage, "interview");
  assert.equal(before.body.interviews[0].state, "scheduled");
  assert.equal(before.body.offers[0].state, "sent");

  const updated = await json("/api/hrx/recruiting/applications/app-001/stage", {
    method: "POST",
    body: JSON.stringify({ stage: "offer" }),
  });
  assert.equal(updated.status, 200);
  assert.equal(updated.body.application.stage, "offer");
});

test("POST recruiting CRUD creates a new pipeline and converts it to employee source of truth", async () => {
  const suffix = "d12_api_001";
  const jobOpeningId = `job_${suffix}`;
  const candidateId = `cand_${suffix}`;
  const applicationId = `app_${suffix}`;
  const interviewId = `int_${suffix}`;
  const offerId = `offer_${suffix}`;
  const employeeId = `emp_${suffix}`;
  const profileId = `profile_${suffix}`;

  const jobOpening = await json("/api/hrx/recruiting/job-openings", {
    method: "POST",
    body: JSON.stringify({
      job_opening_id: jobOpeningId,
      title: "D12 Recruiting Counsel",
      department_ref: "PracticeGroup:litigation",
      hiring_manager_employee_id: "emp_amic_jwsuh",
      position_count: 1,
      state: "open",
      approval_ref: "Approval:d12-job",
      opened_at: "2026-07-03T00:00:00.000Z",
    }),
  });
  assert.equal(jobOpening.status, 201);
  assert.equal(jobOpening.body.job_opening.job_opening_id, jobOpeningId);

  const candidate = await json("/api/hrx/recruiting/candidates", {
    method: "POST",
    body: JSON.stringify({
      candidate_id: candidateId,
      legal_name: "D12 Candidate",
      email: "d12.candidate@example.test",
      source_ref: "ATS:d12-api",
      resume_ref: "DMS:d12-resume",
      retention_policy_id: "candidate-retention-2y",
      consent: {
        consent_id: "consent_d12_api_001",
        candidate_id: candidateId,
        purpose: "recruiting_processing",
        granted_at: "2026-07-03T00:00:00.000Z",
        evidence_ref: "ConsentEvidence:d12-api",
      },
    }),
  });
  assert.equal(candidate.status, 201);
  assert.equal(candidate.body.candidate.candidate_id, candidateId);

  const application = await json("/api/hrx/recruiting/applications", {
    method: "POST",
    body: JSON.stringify({
      application_id: applicationId,
      candidate_id: candidateId,
      job_opening_id: jobOpeningId,
      submitted_at: "2026-07-03T01:00:00.000Z",
    }),
  });
  assert.equal(application.status, 201);
  assert.equal(application.body.application.stage, "submitted");

  const interview = await json("/api/hrx/recruiting/interviews", {
    method: "POST",
    body: JSON.stringify({
      interview_id: interviewId,
      application_id: applicationId,
      candidate_id: candidateId,
      scheduled_for: "2026-07-04T10:00:00.000Z",
      schedule_source_ref: "CalendarEvent:d12-api",
      interviewer_employee_ids: ["emp_amic_jwsuh"],
    }),
  });
  assert.equal(interview.status, 201);
  assert.equal(interview.body.interview.interview_id, interviewId);

  const offer = await json("/api/hrx/recruiting/offers", {
    method: "POST",
    body: JSON.stringify({
      offer_id: offerId,
      application_id: applicationId,
      candidate_id: candidateId,
      compensation_ref: "CompPackage:d12-api",
      document_ref: "DMS:d12-offer-letter",
      state: "sent",
      approval_ref: "Approval:d12-offer",
    }),
  });
  assert.equal(offer.status, 201);
  assert.equal(offer.body.offer.state, "sent");

  for (const stage of ["screening", "interview", "offer", "hired"]) {
    const updated = await json(`/api/hrx/recruiting/applications/${applicationId}/stage`, {
      method: "POST",
      body: JSON.stringify({ stage, stage_reason: `d12_${stage}` }),
    });
    assert.equal(updated.status, 200);
    assert.equal(updated.body.application.stage, stage);
  }

  const accepted = await json(`/api/hrx/recruiting/offers/${offerId}/stage`, {
    method: "POST",
    body: JSON.stringify({ state: "accepted", approval_ref: "Approval:d12-offer" }),
  });
  assert.equal(accepted.status, 200);
  assert.equal(accepted.body.offer.state, "accepted");

  const converted = await json(`/api/hrx/recruiting/applications/${applicationId}/convert-to-employee`, {
    method: "POST",
    body: JSON.stringify({
      approval_ref: "Approval:d12-convert",
      employee_id: employeeId,
      profile_id: profileId,
      title: "Recruiting Counsel",
      org_unit_id: "org_legal",
      manager_employee_id: "emp_amic_jwsuh",
      effective_from: "2026-08-01",
    }),
  });
  assert.equal(converted.status, 201);
  assert.equal(converted.body.conversion.employee.employee_id, employeeId);
  assert.equal(converted.body.conversion.employment_profile.profile_id, profileId);
  assert.equal(converted.body.conversion.employee.source_ref, `Candidate:${candidateId}`);
  assert.equal(converted.body.conversion.employment_profile.source_ref, `Offer:${offerId}`);

  const detail = await json(`/api/hrx/employees/${employeeId}`);
  assert.equal(detail.status, 200);
  assert.equal(detail.body.employee.employee_id, employeeId);
  assert.equal(detail.body.employment_profile.profile_id, profileId);

  const pipeline = await json("/api/hrx/recruiting/pipeline");
  assert.equal(pipeline.status, 200);
  assert.ok(pipeline.body.applications.some((item) => item.application_id === applicationId && item.stage === "hired"));
  assert.ok(pipeline.body.offers.some((item) => item.offer_id === offerId && item.state === "accepted"));

  const audit = await json("/api/hrx/audit");
  assert.ok(audit.body.events.some((event) => event.action === "hrx.candidate.create" && event.object_id === candidateId));
  assert.ok(audit.body.events.some((event) => event.action === "hrx.candidate.convert_to_employee" && event.object_id === employeeId));
});

test("GET and POST lifecycle routes update onboarding and offboarding through API", async () => {
  const onboarding = await json("/api/hrx/lifecycle/onboarding");
  assert.equal(onboarding.status, 200);
  assert.equal(onboarding.body.onboarding[0].onboarding_id, "onb-001");
  assert.equal(onboarding.body.onboarding[0].tasks[0].status, "pending");

  const updatedTask = await json("/api/hrx/lifecycle/onboarding/onb-001/tasks/policy-ack", {
    method: "POST",
    body: JSON.stringify({ status: "completed" }),
  });
  assert.equal(updatedTask.status, 200);
  assert.equal(updatedTask.body.onboarding.tasks.find((task) => task.task_id === "policy-ack").status, "completed");

  const offboarding = await json("/api/hrx/lifecycle/offboarding");
  assert.equal(offboarding.status, 200);
  assert.equal(offboarding.body.offboarding[0].offboarding_id, "off-001");
  assert.equal(offboarding.body.offboarding[0].access_revocations[0].confirmation_ref, "LX-11:AccessRevocation:off-001:idp-core");
  assert.equal(offboarding.body.offboarding[0].matter_reassignments[0].reassigned, true);

  const blockedReassignment = await json("/api/hrx/lifecycle/offboarding/off-001/close", {
    method: "POST",
    body: JSON.stringify({
      matter_reassignments: [{ matter_id: "matter_rp05_synthetic_opening", reassigned: false }],
    }),
  });
  assert.equal(blockedReassignment.status, 400);
  assert.equal(blockedReassignment.body.safe_error_code, "HRX_OFFBOARDING_CLOSE_BLOCKED");

  const closed = await json("/api/hrx/lifecycle/offboarding/off-001/close", {
    method: "POST",
    body: JSON.stringify({}),
  });
  assert.equal(closed.status, 200);
  assert.equal(closed.body.offboarding.state, "closed");

  const audit = await json("/api/hrx/audit");
  assert.ok(audit.body.events.some((event) => event.action === "hrx.onboarding.task.update"));
  assert.ok(audit.body.events.some((event) => event.action === "hrx.offboarding.close"));
});

test("GET and POST /api/hrx/policies manages policy versions through API", async () => {
  const before = await json("/api/hrx/policies");
  assert.equal(before.status, 200);
  assert.ok(before.body.policies.some((policy) => policy.policy_id === "pto-us"));

  const created = await json("/api/hrx/policies", {
    method: "POST",
    body: JSON.stringify({
      policy_id: "policy-api-created",
      policy_type: "retention",
      policy_version: "2026.2",
      effective_from: "2026-08-01",
    }),
  });
  assert.equal(created.status, 201);
  assert.equal(created.body.policy.policy_version, "2026.2");
});

test("GET /api/hrx/audit remains tenant scoped", async () => {
  const { status, body } = await json("/api/hrx/audit");
  assert.equal(status, 200);
  assert.ok(body.events.length >= 1);
  assert.ok(body.events.every((event) => event.tenant_id === "tenant_amic_matter_vault"));
});

test("POST /api/hrx/payroll creates preview, approval and export artifact without payment execution", async () => {
  const preview = await json("/api/hrx/payroll/preview", {
    method: "POST",
    body: JSON.stringify({
      preview_id: "payroll-api-preview-001",
      payroll_period: "2026-06",
      employee_ids: ["emp_amic_ytkim", "emp_amic_wsjo"],
      external_provider: "external-preview-only",
    }),
  });
  assert.equal(preview.status, 201);
  assert.equal(preview.body.preview.calculation_runtime, false);
  assert.equal(preview.body.preview.disbursement_instruction_included, false);
  assert.equal(preview.body.preview.human_review_required, true);

  const approved = await json("/api/hrx/payroll/approve", {
    method: "POST",
    body: JSON.stringify({
      preview_id: "payroll-api-preview-001",
      approval_ref: "Approval:payroll-api-preview-001",
    }),
  });
  assert.equal(approved.status, 200);
  assert.equal(approved.body.preview.state, "approved");

  const exported = await json("/api/hrx/payroll/export", {
    method: "POST",
    body: JSON.stringify({
      preview_id: "payroll-api-preview-001",
      export_artifact_ref: "DMS:payroll-api-preview-001",
      provider_payload_ref: "ProviderDraft:payroll-api-preview-001",
    }),
  });
  assert.equal(exported.status, 200);
  assert.equal(exported.body.artifact.calculation_runtime, false);
  assert.equal(exported.body.artifact.disbursement_instruction_included, false);
  assert.equal(exported.body.artifact.human_review_required, true);

  const audit = await json("/api/hrx/audit");
  assert.ok(audit.body.events.some((event) => event.action === "hrx.payroll.preview"));
  assert.ok(audit.body.events.some((event) => event.action === "hrx.payroll.approve"));
  assert.ok(audit.body.events.some((event) => event.action === "hrx.payroll.export"));
});

test("GET /api/hrx/analytics returns aggregate People metrics without row-level detail", async () => {
  const { status, body } = await json("/api/hrx/analytics");
  assert.equal(status, 200);
  assert.equal(body.analytics.row_level_details_included, false);
  assert.ok(body.analytics.headcount.total >= 2);
  assert.ok(body.workload_projection.every((row) => row.workload_source === "time_entry_aggregation"));
  assert.ok(body.workload_projection.some((row) => row.time_entry_count > 0));
  assert.ok(Array.isArray(body.workload_conflicts));
  assert.equal(JSON.stringify(body.analytics).includes("김양태"), false);
});
