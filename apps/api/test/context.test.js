import assert from "node:assert/strict";
import test from "node:test";
import { parseActorContext, requireActorContext, buildHrxRequestContext } from "../src/middleware/actor-context.js";
import { parseTenantContext, requireTenantContext } from "../src/middleware/tenant-context.js";

test("HRX tenant context fails closed when missing", () => {
  const context = parseTenantContext({});
  assert.equal(context.ok, false);
  assert.equal(context.fail_closed, true);
  assert.equal(context.safe_error_code, "HRX_TENANT_CONTEXT_REQUIRED");
  assert.throws(() => requireTenantContext({}), /HRX_TENANT_CONTEXT_REQUIRED/);
});

test("HRX actor context fails closed when missing", () => {
  const context = parseActorContext({});
  assert.equal(context.ok, false);
  assert.equal(context.fail_closed, true);
  assert.equal(context.safe_error_code, "HRX_ACTOR_CONTEXT_REQUIRED");
  assert.throws(() => requireActorContext({}), /HRX_ACTOR_CONTEXT_REQUIRED/);
});

test("HRX request context binds tenant and actor", () => {
  const tenant = requireTenantContext({ "x-lawos-tenant-id": "tenant-a" });
  const actor = requireActorContext({ "x-lawos-actor-id": "user-a", "x-lawos-actor-role": "hr_admin" });
  assert.deepEqual(buildHrxRequestContext({ tenant, actor }), {
    tenant_id: "tenant-a",
    actor_id: "user-a",
    actor_role: "hr_admin",
  });
});
