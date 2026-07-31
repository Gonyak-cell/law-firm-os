import assert from "node:assert/strict";
import test from "node:test";

import { createHrxRuntimeContext, handleHrxApiRequest } from "../../src/hrx-runtime-context.js";
import { hrxRoleProfileAllowsPolicy, hrxScopesForRoleProfile } from "../../src/hrx-role-scope-matrix.js";
import { resolveHrxRoutePolicy } from "../../src/routes/hrx/route-policy-map.js";
import { runHrxMigrations } from "../../../../packages/hrx/src/migrations/index.js";
import { createFileHrxStore } from "../../../../packages/hrx/src/store/file-store.js";
import { encryptCompensationAmount } from "../../../../packages/hrx/src/compensation.js";

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
    store.query("insert", {
      table: "hrx_compensation_records",
      row: {
        tenant_id: TENANT,
        compensation_id: "comp-self",
        employee_id: "emp-self",
        encrypted_amount_ref: encryptCompensationAmount({ tenant_id: TENANT, employee_id: "emp-self", compensation_id: "comp-self", amount_minor: 3_000_000, currency_ref: "KRW" }, { allowSyntheticKey: true }),
        currency_ref: "KRW",
        raw_amount_included: false,
        effective_from: "2026-01-01",
        effective_to: null,
        source_ref: "artifact:synthetic-compensation/emp-self",
        employment_contract_id: "contract-emp-self",
        contract_document_ref: "artifact:contract/emp-self",
        created_at: NOW,
        updated_at: NOW,
      },
    });
    context.repository.createEmployee({ tenant_id: TENANT, employee_id: "emp-other", display_name: "다른 구성원", status: "active" });
    store.query("insert", {
      table: "hrx_compensation_records",
      row: {
        tenant_id: TENANT,
        compensation_id: "comp-other",
        employee_id: "emp-other",
        encrypted_amount_ref: encryptCompensationAmount({ tenant_id: TENANT, employee_id: "emp-other", compensation_id: "comp-other", amount_minor: 3_100_000, currency_ref: "KRW" }, { allowSyntheticKey: true }),
        currency_ref: "KRW",
        raw_amount_included: false,
        effective_from: "2026-01-01",
        effective_to: null,
        source_ref: "artifact:synthetic-compensation/emp-other",
        employment_contract_id: "contract-emp-other",
        contract_document_ref: "artifact:contract/emp-other",
        created_at: NOW,
        updated_at: NOW,
      },
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
      compensation_ref: "compensation:comp-self",
      deduction_input: {
        dependent_count: 0,
        income_tax_exempt: false,
        withholding_category: null,
        pension: { enrolled: false },
        health: { enrolled: false },
        employment_insurance: { enrolled: false },
      },
      effective_from: "2026-01-01",
    });
    assert.equal(profile.status, 201, JSON.stringify(profile.body));

    const deductionInput = {
      dependent_count: 0,
      income_tax_exempt: false,
      withholding_category: null,
      pension: { enrolled: false },
      health: { enrolled: false },
      employment_insurance: { enrolled: false },
    };
    const missingCompensation = await request(context, "/api/hrx/payroll/profiles", "POST", {
      payroll_profile_id: "profile-missing-compensation",
      employee_id: "emp-self",
      employment_type: "monthly",
      pay_group_code: "KR-MONTHLY",
      compensation_ref: "compensation:not-found",
      deduction_input: deductionInput,
      effective_from: "2026-02-01",
    });
    assert.equal(missingCompensation.status, 400);
    assert.equal(missingCompensation.body.safe_error_code, "HRX_PAYROLL_COMPENSATION_RECORD_MISSING");
    const crossEmployee = await request(context, "/api/hrx/payroll/profiles", "POST", {
      payroll_profile_id: "profile-cross-employee",
      employee_id: "emp-self",
      employment_type: "monthly",
      pay_group_code: "KR-MONTHLY",
      compensation_ref: "compensation:comp-other",
      deduction_input: deductionInput,
      effective_from: "2026-02-01",
    });
    assert.equal(crossEmployee.status, 400);
    assert.equal(crossEmployee.body.safe_error_code, "HRX_PAYROLL_COMPENSATION_EMPLOYEE_MISMATCH");
    const missingDeduction = await request(context, "/api/hrx/payroll/profiles", "POST", {
      payroll_profile_id: "profile-missing-deduction",
      employee_id: "emp-self",
      employment_type: "monthly",
      pay_group_code: "KR-MONTHLY",
      compensation_ref: "compensation:comp-self",
      effective_from: "2026-02-01",
    });
    assert.equal(missingDeduction.status, 400);
    assert.equal(missingDeduction.body.safe_error_code, "HRX_PAYROLL_DEDUCTION_INPUT_REQUIRED");

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
    assert.deepEqual(Object.keys(self.body.profiles[0]).sort(), [
      "assignments", "compensation_quantity", "compensation_unit", "currency", "effective_from", "effective_to",
      "employee_id", "employment_type", "pay_group_code", "payroll_profile_id", "state_version", "status",
    ].sort());
    assert.deepEqual(Object.keys(self.body.profiles[0].assignments[0]).sort(), [
      "assignment_id", "currency_ref", "effective_from", "effective_to", "employee_id", "encrypted_amount_ref_included",
      "item_id", "masked_compensation_ref", "payroll_profile_id", "raw_amount_included", "status", "version",
    ].sort());
    assert.equal(Object.hasOwn(self.body.profiles[0], "compensation_ref"), false);
    assert.equal(Object.hasOwn(self.body.profiles[0], "deduction_input_json"), false);
    assert.equal(Object.hasOwn(self.body.profiles[0].assignments[0], "source_ref"), false);

    const retiredAssignment = await request(context, "/api/hrx/payroll/profiles/profile-self/assignments/assignment-self-v1/retire", "POST", {
      expected_version: 1,
    });
    assert.equal(retiredAssignment.status, 200, JSON.stringify(retiredAssignment.body));
    assert.equal(retiredAssignment.body.assignment.status, "inactive");

    const mismatch = await request(context, "/api/hrx/payroll/profiles/profile-self", "PATCH", {
      payroll_profile_id: "different-profile",
      status: "inactive",
    });
    assert.equal(mismatch.status, 400);
    assert.equal(mismatch.body.safe_error_code, "HRX_PAYROLL_PROFILE_ID_MISMATCH");
    for (const bodyId of ["", null, 123]) {
      const invalidBodyId = await request(context, "/api/hrx/payroll/profiles/profile-self", "PATCH", {
        payroll_profile_id: bodyId,
        status: "inactive",
      });
      assert.equal(invalidBodyId.status, 400, JSON.stringify(invalidBodyId.body));
      assert.equal(invalidBodyId.body.safe_error_code, "HRX_PAYROLL_PROFILE_ID_MISMATCH");
    }
    const matching = await request(context, "/api/hrx/payroll/profiles/profile-self", "PATCH", {
      payroll_profile_id: "profile-self",
      expected_version: 1,
      status: "inactive",
    });
    assert.equal(matching.status, 200, JSON.stringify(matching.body));
    assert.equal(matching.body.profile.status, "inactive");

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
