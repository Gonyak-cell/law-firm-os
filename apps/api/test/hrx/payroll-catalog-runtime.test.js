import assert from "node:assert/strict";
import test from "node:test";

import { createHrxRuntimeContext, handleHrxApiRequest } from "../../src/hrx-runtime-context.js";
import { hrxRoleProfileAllowsPolicy, hrxScopesForRoleProfile } from "../../src/hrx-role-scope-matrix.js";
import { resolveHrxRoutePolicy } from "../../src/routes/hrx/route-policy-map.js";
import { runHrxMigrations } from "../../../../packages/hrx/src/migrations/index.js";
import { createFileHrxStore } from "../../../../packages/hrx/src/store/file-store.js";

const TENANT = "tenant-payroll-catalog-runtime";
const NOW = "2026-07-15T01:00:00.000Z";
const HR = Object.freeze({ tenant_id: TENANT, actor_id: "hr-catalog-admin", step_up_verified: true });

function request(context, pathname, method = "GET", body = {}, actor = HR, query = {}) {
  return handleHrxApiRequest({ pathname, method, body, query, context, requestContext: actor });
}

test("RC-005-A resolves the payroll catalog, profile, and approved-time policies with least privilege", () => {
  const cases = [
    ["GET", "/api/hrx/payroll/items", "hrx.payroll.items.read"],
    ["POST", "/api/hrx/payroll/items", "hrx.payroll.items.write"],
    ["PATCH", "/api/hrx/payroll/items/base-salary", "hrx.payroll.items.write"],
    ["GET", "/api/hrx/payroll/me/profile", "hrx.payroll.self.read"],
    ["GET", "/api/hrx/payroll/profiles/emp-001", "hrx.payroll.profiles.read"],
    ["POST", "/api/hrx/payroll/profiles", "hrx.payroll.profiles.write"],
    ["POST", "/api/hrx/payroll/profiles/profile-001/assignments", "hrx.payroll.profiles.write"],
    ["POST", "/api/hrx/payroll/attendance-approvals", "hrx.payroll.time-inputs.write"],
  ];
  for (const [method, pathname, scope] of cases) {
    const policy = resolveHrxRoutePolicy({ method, pathname });
    assert.equal(policy?.required_scope, scope, `${method} ${pathname}`);
    assert.equal(policy?.purpose, "payroll_export_review", `${method} ${pathname}`);
  }

  assert.equal(hrxScopesForRoleProfile("employee").includes("hrx.payroll.self.read"), true);
  assert.equal(hrxScopesForRoleProfile("employee").includes("hrx.payroll.items.read"), false);
  assert.equal(hrxRoleProfileAllowsPolicy("hr", resolveHrxRoutePolicy({ method: "POST", pathname: "/api/hrx/payroll/items" })), true);
  assert.equal(hrxRoleProfileAllowsPolicy("payroll_preparer", resolveHrxRoutePolicy({ method: "GET", pathname: "/api/hrx/payroll/items" })), true);
  assert.equal(hrxRoleProfileAllowsPolicy("payroll_preparer", resolveHrxRoutePolicy({ method: "POST", pathname: "/api/hrx/payroll/items" })), false);
  assert.equal(hrxRoleProfileAllowsPolicy("payroll_approver", resolveHrxRoutePolicy({ method: "POST", pathname: "/api/hrx/payroll/attendance-approvals" })), false);
});

test("RC-005-F exposes tenant-scoped catalog and masked profile assignments through the canonical runtime", async () => {
  const store = createFileHrxStore();
  try {
    runHrxMigrations(store);
    const context = createHrxRuntimeContext({ store, clock: () => NOW });
    context.repository.createEmployee({ tenant_id: TENANT, employee_id: "emp-self", display_name: "합성 구성원", status: "active" });
    context.repository.createEmployeeUserLink({
      tenant_id: TENANT,
      link_id: "link-self",
      employee_id: "emp-self",
      user_id: "user-self",
      purpose: "login_mapping",
    });

    const createdItem = await request(context, "/api/hrx/payroll/items", "POST", {
      item_id: "base-salary",
      code: "base_salary",
      display_name: "기본급",
      kind: "earning",
      tax_treatment: "taxable",
      value_mode: "fixed",
      calculation_order: 10,
      effective_from: "2026-01-01",
    });
    assert.equal(createdItem.status, 201, JSON.stringify(createdItem.body));
    assert.equal(createdItem.body.item.code, "BASE_SALARY");

    const profile = await request(context, "/api/hrx/payroll/profiles", "POST", {
      payroll_profile_id: "profile-self",
      employee_id: "emp-self",
      employment_type: "monthly",
      pay_group_code: "KR-MONTHLY",
      compensation_ref: "compensation:profile-self",
      effective_from: "2026-01-01",
    });
    assert.equal(profile.status, 201, JSON.stringify(profile.body));

    const assignment = await request(context, "/api/hrx/payroll/profiles/profile-self/assignments", "POST", {
      assignment_id: "assignment-self-v1",
      item_id: "base-salary",
      version: 1,
      amount_minor: 12_345_678,
      effective_from: "2026-01-01",
      source_ref: "HRX:payroll-assignment:self:v1",
    });
    assert.equal(assignment.status, 201, JSON.stringify(assignment.body));
    assert.match(assignment.body.assignment.masked_compensation_ref, /^compensation_ref_hash:/);
    assert.equal(JSON.stringify(assignment.body).includes("12345678"), false);
    assert.doesNotMatch(JSON.stringify(assignment.body), /"encrypted_amount_ref":/);

    const self = await request(
      context,
      "/api/hrx/payroll/me/profile",
      "GET",
      {},
      { tenant_id: TENANT, actor_id: "user-self", step_up_verified: true },
      { employee_id: "forged-other" },
    );
    assert.equal(self.status, 200, JSON.stringify(self.body));
    assert.equal(self.body.profiles[0].employee_id, "emp-self");
    assert.equal(self.body.profiles[0].assignments.length, 1);

    const isolated = await request(
      context,
      "/api/hrx/payroll/items",
      "GET",
      {},
      { tenant_id: "tenant-other", actor_id: "hr-other", step_up_verified: true },
    );
    assert.deepEqual(isolated.body.items, []);
  } finally {
    store.close();
  }
});

test("RC-005-F records immutable attendance approval receipts for the canonical run snapshot", async () => {
  const store = createFileHrxStore();
  try {
    runHrxMigrations(store);
    const context = createHrxRuntimeContext({ store, clock: () => NOW });
    context.repository.createEmployee({ tenant_id: TENANT, employee_id: "emp-time", display_name: "합성 근태", status: "active" });
    context.attendance.write({
      tenant_id: TENANT,
      attendance_id: "attendance-approved",
      employee_id: "emp-time",
      work_date: "2026-07-14",
      status: "present",
      source_kind: "manual",
      source_ref: "Attendance:attendance-approved:v1",
      clock_in_at: "2026-07-14T09:00:00+09:00",
      clock_out_at: "2026-07-14T18:00:00+09:00",
    });

    const approved = await request(context, "/api/hrx/payroll/attendance-approvals", "POST", {
      attendance_id: "attendance-approved",
      idempotency_key: "attendance-approved-v1",
    });
    assert.equal(approved.status, 201, JSON.stringify(approved.body));
    assert.equal(approved.body.approval_receipt.attendance_source_ref, "Attendance:attendance-approved:v1");

    const replay = await request(context, "/api/hrx/payroll/attendance-approvals", "POST", {
      attendance_id: "attendance-approved",
      idempotency_key: "attendance-approved-v1",
    });
    assert.equal(replay.body.approval_receipt.approval_receipt_id, approved.body.approval_receipt.approval_receipt_id);
    assert.equal(store.query("select", { table: "hrx_attendance_approval_receipts", where: { tenant_id: TENANT } }).length, 1);
  } finally {
    store.close();
  }
});
