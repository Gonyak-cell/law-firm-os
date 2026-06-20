import assert from "node:assert/strict";
import test from "node:test";
import { evaluateHrxPolicy } from "../src/hrx-policy-engine.js";

const basePrincipal = {
  tenant_id: "tenant-a",
  user_id: "user-a",
  role_ids: ["hr_admin"],
  hrx_scopes: ["hrx.employee.read"],
  allowed_purposes: ["hr_operations"],
};

const baseResource = {
  tenant_id: "tenant-a",
  resource_type: "hrx.employee",
  resource_id: "emp-001",
  sensitivity: "employee",
};

test("HRX ABAC policy allows scoped HR purpose", () => {
  const decision = evaluateHrxPolicy({
    principal: basePrincipal,
    resource: baseResource,
    action: "read",
    purpose: "hr_operations",
  });
  assert.equal(decision.effect, "allow");
  assert.equal(decision.audit_required, true);
});

test("HRX ABAC policy denies by tenant, role, purpose, and scope", () => {
  assert.equal(
    evaluateHrxPolicy({
      principal: { ...basePrincipal, tenant_id: "tenant-b" },
      resource: baseResource,
      purpose: "hr_operations",
    }).reason,
    "hrx_cross_tenant_deny",
  );
  assert.equal(
    evaluateHrxPolicy({
      principal: { ...basePrincipal, role_ids: ["crm_user"] },
      resource: baseResource,
      purpose: "hr_operations",
    }).reason,
    "hrx_role_required",
  );
  assert.equal(evaluateHrxPolicy({ principal: basePrincipal, resource: baseResource }).reason, "hrx_purpose_required");
  assert.equal(
    evaluateHrxPolicy({
      principal: { ...basePrincipal, hrx_scopes: [] },
      resource: baseResource,
      purpose: "hr_operations",
    }).reason,
    "hrx_scope_required",
  );
});
