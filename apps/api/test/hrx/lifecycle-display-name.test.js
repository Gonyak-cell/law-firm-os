import assert from "node:assert/strict";
import test from "node:test";
import { createHrxRuntimeContext, handleHrxApiRequest } from "../../src/hrx-runtime-context.js";
import { createOnboardingPlan } from "../../../../packages/hrx/src/onboarding.js";
import { createOffboardingCase } from "../../../../packages/hrx/src/offboarding.js";

function get(context, pathname, scopes) {
  return handleHrxApiRequest({
    pathname,
    method: "GET",
    context,
    requestContext: {
      tenant_id: "tenant-a",
      actor_id: "lifecycle-viewer",
      actor_role: "people_ops",
      hrx_scopes: scopes,
      session_bound: true,
    },
  });
}

test("PEO-FIX-046 lifecycle API projects roster names only with employee-read permission", () => {
  const context = createHrxRuntimeContext({ seedRuntimeFixtures: false });
  for (const [employeeId, displayName] of [
    ["emp-onboarding", "입사 예정 변호사"],
    ["emp-offboarding", "퇴사 예정 변호사"],
  ]) {
    context.repository.createEmployee({
      tenant_id: "tenant-a",
      employee_id: employeeId,
      display_name: displayName,
      status: "active",
    });
  }
  context.onboardingPlans.push(createOnboardingPlan({
    tenant_id: "tenant-a",
    onboarding_id: "onboarding-name-projection",
    employee_id: "emp-onboarding",
    start_date: "2026-08-01",
    tasks: [{ task_id: "documents", title: "입사 서류 확인", owner_role: "people_ops" }],
  }));
  context.offboardingCases.push(createOffboardingCase({
    tenant_id: "tenant-a",
    offboarding_id: "offboarding-name-projection",
    employee_id: "emp-offboarding",
    separation_date: "2026-08-31",
    access_revocations: [],
    document_returns: [],
    legal_hold_checks: [],
    matter_reassignments: [],
    handover_items: [],
  }));
  for (const pathname of [
    "/api/hrx/lifecycle/onboarding",
    "/api/hrx/lifecycle/offboarding",
  ]) {
    const authorized = get(context, pathname, ["hrx.lifecycle.read", "hrx.employee.read"]);
    assert.equal(authorized.status, 200);
    const key = pathname.endsWith("onboarding") ? "onboarding" : "offboarding";
    assert.ok(authorized.body[key].length > 0);
    for (const item of authorized.body[key]) {
      assert.equal(
        item.employee_display_name,
        context.repository.getEmployee({
          tenant_id: "tenant-a",
          employee_id: item.employee_id,
        })?.display_name,
      );
    }

    const lifecycleOnly = get(context, pathname, ["hrx.lifecycle.read"]);
    assert.equal(lifecycleOnly.status, 200);
    assert.ok(lifecycleOnly.body[key].every((item) => item.employee_display_name === null));
  }
});
