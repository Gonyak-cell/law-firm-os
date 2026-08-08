import assert from "node:assert/strict";
import test from "node:test";
import {
  OUTLOOK_TIME_ENTRY_DRAFT_ERROR_CODES as CODES,
  OUTLOOK_TIME_ENTRY_NARRATIVE_MAX_LENGTH,
} from "../src/outlook-time-entry-draft-adapter.js";
import {
  ACTOR,
  EMPLOYEE,
  TENANT,
  createEmployeeFixture,
  createFinanceFixture,
  createMatterFixture,
  invoke,
  permissionContext,
  requestBody,
  runtime,
} from "./helpers/outlook-time-entry-draft-fixture.js";

function fixture(options = {}) {
  const matters = createMatterFixture();
  const finance = createFinanceFixture(options);
  return { finance, matters, close() { finance.close(); matters.close(); } };
}

test("Outlook draft fails closed for unsupported, malformed, denied, and cross-tenant input", async (t) => {
  const state = fixture();
  t.after(() => state.close());
  const routeRuntime = runtime({ finance: state.finance, matters: state.matters });
  const invalidBodies = [
    requestBody({ actor_id: ACTOR }),
    requestBody({ internet_message_id: "<raw@amic.kr>" }),
    requestBody({ conversation_id: "raw-conversation" }),
    requestBody({ matter_id: "" }),
    requestBody({ duration_minutes: 0 }),
    requestBody({ duration_minutes: 1.5 }),
    requestBody({ narrative: "첫 줄\n둘째 줄" }),
    requestBody({ narrative: "가".repeat(OUTLOOK_TIME_ENTRY_NARRATIVE_MAX_LENGTH + 1) }),
    requestBody({ billable: "true" }),
    requestBody({ work_date: "2026-02-30" }),
    requestBody({ status: "approved" }),
    requestBody({ role_id: "partner" }),
  ];
  for (const body of invalidBodies) {
    const result = await invoke({ body, runtime: routeRuntime });
    assert.equal(result.status, 400, JSON.stringify(body));
    assert.deepEqual(result.body.safe_error_codes, [CODES.invalid]);
  }
  const foreign = await invoke({ body: requestBody({ tenant_id: "foreign" }), runtime: routeRuntime });
  assert.equal(foreign.status, 403);
  assert.deepEqual(foreign.body.safe_error_codes, [CODES.tenant_mismatch]);
  const denied = await invoke({ context: permissionContext({ finance: false }), runtime: routeRuntime });
  assert.equal(denied.status, 403);
  assert.deepEqual(denied.body.safe_error_codes, [CODES.denied]);
});

test("authoritative employee and RateCard mapping reject static snapshot and role mismatches", async (t) => {
  const state = fixture();
  t.after(() => state.close());
  const staticMismatch = await invoke({
    runtime: runtime({
      finance: state.finance,
      matters: state.matters,
      employees: [{ tenant_id: TENANT, user_id: ACTOR, employee_id: "other-employee", status: "active", payroll_category: "partner" }],
    }),
  });
  assert.equal(staticMismatch.status, 409);
  assert.deepEqual(staticMismatch.body.safe_error_codes, [CODES.authority_mismatch]);

  const staticRoleMismatch = await invoke({
    runtime: runtime({
      finance: state.finance,
      matters: state.matters,
      employees: [{ tenant_id: TENANT, user_id: ACTOR, employee_id: EMPLOYEE, status: "active", payroll_category: "staff" }],
    }),
  });
  assert.equal(staticRoleMismatch.status, 409);
  assert.deepEqual(staticRoleMismatch.body.safe_error_codes, [CODES.authority_mismatch]);

  const roleMismatch = await invoke({
    runtime: runtime({
      finance: state.finance,
      matters: state.matters,
      employees: [],
      resolveTimeEntryRole: () => "staff",
    }),
  });
  assert.equal(roleMismatch.status, 422);
  assert.deepEqual(roleMismatch.body.safe_error_codes, [CODES.role_mismatch]);
  assert.equal(state.finance.list({ tenant_id: TENANT, model_type: "TimeEntry" }).length, 0);
});

test("signed user needs one active HRX identity and unambiguous active Finance role", async (t) => {
  const state = fixture({ roleRates: [
    { role_id: "partner", hourly_rate: 400000 },
    { role_id: "staff", hourly_rate: 200000 },
  ] });
  t.after(() => state.close());
  const ambiguousRole = await invoke({
    runtime: runtime({ finance: state.finance, matters: state.matters, employees: [] }),
  });
  assert.equal(ambiguousRole.status, 422);
  assert.deepEqual(ambiguousRole.body.safe_error_codes, [CODES.role_required]);

  const inactiveEmployee = await invoke({
    runtime: runtime({
      finance: state.finance,
      matters: state.matters,
      employeeRepository: createEmployeeFixture({ employeeStatus: "inactive" }),
      employees: [],
      resolveTimeEntryRole: () => "partner",
    }),
  });
  assert.equal(inactiveEmployee.status, 403);
  assert.deepEqual(inactiveEmployee.body.safe_error_codes, [CODES.employee_required]);

  const wrongTenantDirectory = createEmployeeFixture();
  const missingIdentity = await invoke({
    runtime: runtime({
      finance: state.finance,
      matters: state.matters,
      employeeRepository: {
        ...wrongTenantDirectory,
        listEmployeeUserLinks: () => [],
      },
      employees: [{ tenant_id: TENANT, user_id: ACTOR, employee_id: EMPLOYEE, payroll_category: "partner" }],
      resolveTimeEntryRole: () => "partner",
    }),
  });
  assert.equal(missingIdentity.status, 403);
  assert.deepEqual(missingIdentity.body.safe_error_codes, [CODES.employee_required]);
});
