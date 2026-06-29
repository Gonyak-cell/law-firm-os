import assert from "node:assert/strict";
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import { startApiServer } from "../src/server.js";
import { createSqlHrxRepository } from "../../../packages/hrx/src/repository-sql.js";
import { runHrxMigrations } from "../../../packages/hrx/src/migrations/index.js";
import { createFileHrxStore } from "../../../packages/hrx/src/store/file-store.js";
import {
  HRX_MEMBER_ROSTER_SOURCE_REF,
  listHrxMemberRosterRows,
} from "../src/hrx-member-roster-registry.js";

let server;
let baseUrl;

const HRX_AUTH_HEADERS = Object.freeze({
  "x-lawos-tenant-id": "tenant_amic_matter_vault",
  "x-lawos-actor-id": "user_amic_jwsuh",
  "x-lawos-actor-role": "security_admin,hr_admin,people_ops",
  "x-lawos-hrx-step-up": JSON.stringify({
    tenant_id: "tenant_amic_matter_vault",
    actor_id: "user_amic_jwsuh",
    mfa: true,
    assurance_level: 2,
    expires_at: "2999-01-01T00:00:00.000Z",
  }),
  "x-lawos-hrx-scopes": [
    "hrx.employee.read",
    "hrx.employee.write",
    "hrx.document.read",
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
    "hrx.payroll.preview",
    "hrx.payroll.export",
  ].join(","),
});

async function json(path, options = {}) {
  const headers = path.startsWith("/api/hrx") ? { ...HRX_AUTH_HEADERS, ...(options.headers ?? {}) } : options.headers;
  const response = await fetch(`${baseUrl}${path}`, { ...options, headers });
  return { status: response.status, body: await response.json() };
}

test.before(async () => {
  const started = await startApiServer({ port: 0 });
  server = started.server;
  baseUrl = `http://${started.host}:${started.port}`;
});

test.after(() => new Promise((resolve) => server.close(resolve)));

test("HRX member roster source of truth preserves the registered AMIC and PETRA roster", () => {
  const roster = listHrxMemberRosterRows();
  assert.equal(roster.length, 9);
  assert.ok(roster.every((member) => member.source_ref === HRX_MEMBER_ROSTER_SOURCE_REF));
  const membersByName = new Map(roster.map((member) => [member.display_name, member]));
  assert.equal(membersByName.get("김양태")?.title, "대표이사");
  for (const displayName of ["박서영", "조우상", "김양태"]) {
    const member = membersByName.get(displayName);
    assert.equal(member?.affiliation, "PETRA BRIDGE PARTNERS");
    assert.equal(member?.department, "Finance");
    assert.equal(member?.organization_group, "PETRA BRIDGE PARTNERS");
  }
  for (const displayName of ["박병준", "조성민", "임영훈", "서지원"]) {
    const member = membersByName.get(displayName);
    assert.equal(member?.affiliation, "AMIC Law");
    assert.equal(member?.department, "Legal");
    assert.equal(member?.organization_group, "AMIC Law");
  }
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
  assert.equal(body.employees.length, 9);
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
  ]);
  assert.ok(body.employees.every((employee) => employee.source_ref === HRX_MEMBER_ROSTER_SOURCE_REF));
  assert.ok(body.employees.some((employee) => employee.work_email === "jwsuh@amic.kr"));
  assert.ok(body.employees.some((employee) => employee.display_name === "김양태" && employee.title === "대표이사"));
  assert.ok(body.employees.some((employee) => employee.display_name === "이예진" && employee.title === "대리"));
  const employeesByName = new Map(body.employees.map((employee) => [employee.display_name, employee]));
  for (const displayName of ["박서영", "조우상", "김양태"]) {
    assert.equal(employeesByName.get(displayName)?.affiliation, "PETRA BRIDGE PARTNERS");
    assert.equal(employeesByName.get(displayName)?.department, "Finance");
    assert.equal(employeesByName.get(displayName)?.organization_group, "PETRA BRIDGE PARTNERS");
  }
  for (const displayName of ["박병준", "조성민", "임영훈", "서지원"]) {
    assert.equal(employeesByName.get(displayName)?.affiliation, "AMIC Law");
    assert.equal(employeesByName.get(displayName)?.department, "Legal");
    assert.equal(employeesByName.get(displayName)?.organization_group, "AMIC Law");
  }
  for (const displayName of ["윤태리", "이예진"]) {
    assert.equal(employeesByName.get(displayName)?.affiliation, "AMIC Law");
    assert.equal(employeesByName.get(displayName)?.department, "Staff");
    assert.equal(employeesByName.get(displayName)?.organization_group, "Staff");
  }
  assert.ok(body.employees.every((employee) => employee.country === "대한민국"));
});

test("durable HRX seed reconciles stale Matter Vault account seed rows to the member roster source of truth", async () => {
  const store = createFileHrxStore({ filePath: join(mkdtempSync(join(tmpdir(), "hrx-roster-reconcile-")), "store.json") });
  runHrxMigrations(store);
  const repository = createSqlHrxRepository({ store, clock: () => "2026-06-19T00:00:00.000Z" });
  const member = listHrxMemberRosterRows().find((row) => row.display_name === "김양태");
  assert.ok(member);
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

  const started = await startApiServer({ port: 0, hrxStore: store });
  const localBaseUrl = `http://${started.host}:${started.port}`;
  try {
    const response = await fetch(`${localBaseUrl}/api/hrx/employees`, { headers: HRX_AUTH_HEADERS });
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
  } finally {
    await new Promise((resolve) => started.server.close(resolve));
  }
});

test("GET /api/hrx/employees/:id returns profile with compensation masked", async () => {
  const { status, body } = await json("/api/hrx/employees/emp_amic_ytkim");
  assert.equal(status, 200);
  assert.equal(body.employee.employee_id, "emp_amic_ytkim");
  assert.equal(body.employee.affiliation, "PETRA BRIDGE PARTNERS");
  assert.equal(body.employee.department, "Finance");
  assert.equal(body.employee.organization_group, "PETRA BRIDGE PARTNERS");
  assert.equal(body.employment_profile.employee_id, "emp_amic_ytkim");
  assert.equal(body.masked_compensation_ref, null);
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

test("GET /api/hrx/documents returns metadata source refs only", async () => {
  const { status, body } = await json("/api/hrx/documents?employee_id=emp_amic_ytkim");
  assert.equal(status, 200);
  assert.equal(body.documents[0].source_ref, "DMS:hr-policy-ack-001");
  assert.equal(body.documents[0].source_status, "verified");
  assert.equal(body.documents[0].source_provider, "dms");
  assert.equal(Object.hasOwn(body.documents[0], "body"), false);
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
});

test("GET and POST /api/hrx/approvals resolves manager queue and records audit", async () => {
  const before = await json("/api/hrx/approvals");
  assert.equal(before.status, 200);
  assert.ok(before.body.approvals.some((approval) => approval.approval_id === "approval-leave-002"));

  const approved = await json("/api/hrx/approvals/approval-leave-002/approve", {
    method: "POST",
    body: JSON.stringify({ decision_reason: "approved by manager" }),
  });
  assert.equal(approved.status, 200);
  assert.equal(approved.body.approval.state, "approved");

  const audit = await json("/api/hrx/audit");
  assert.ok(audit.body.events.some((event) => event.action === "hrx.approval.approve"));
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
  assert.equal(JSON.stringify(body.analytics).includes("김양태"), false);
});
