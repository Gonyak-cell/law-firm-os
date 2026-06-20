import assert from "node:assert/strict";
import test from "node:test";
import { runAuditVerifyJob } from "../../../packages/audit/src/index.js";
import { assertNoSecretMaterial } from "../../../packages/platform/src/index.js";
import { buildHrxRequestContext, parseActorContext, requireActorContext } from "../src/middleware/actor-context.js";
import { requireWriteAudit } from "../src/middleware/audit-required.js";
import { createCorrelationContext } from "../src/middleware/correlation.js";
import { requireSensitiveReadAudit } from "../src/middleware/sensitive-read-audit.js";
import { parseTenantContext, requireTenantContext } from "../src/middleware/tenant-context.js";
import { createAuditExportResponse } from "../src/routes/audit.js";
import { simulatePermissionReadOnly } from "../src/routes/permission-simulator.js";
import { createSafeErrorEnvelope } from "../src/safe-error.js";

const TENANT = "tenant_cmp_g1";

test("G1 tenant and actor context fail closed and compose request context", () => {
  assert.deepEqual(parseTenantContext({}), {
    ok: false,
    status: 400,
    safe_error_code: "HRX_TENANT_CONTEXT_REQUIRED",
    fail_closed: true,
  });
  assert.throws(() => requireTenantContext({}), /HRX_TENANT_CONTEXT_REQUIRED/);
  assert.throws(() => requireActorContext({}), /HRX_ACTOR_CONTEXT_REQUIRED/);

  const tenant = parseTenantContext({ "x-lawos-tenant-id": TENANT });
  const actor = parseActorContext({ "x-lawos-actor-id": "user-001", "x-lawos-actor-role": "partner" });
  assert.equal(tenant.ok, true);
  assert.equal(actor.ok, true);
  assert.deepEqual(buildHrxRequestContext({ tenant, actor }), {
    tenant_id: TENANT,
    actor_id: "user-001",
    actor_role: "partner",
  });
});

test("G1 audit middleware, correlation, and safe error envelopes do not leak counts", () => {
  const writeAudit = requireWriteAudit({ tenant_id: TENANT, actor_id: "user-001", action: "matter.write", audit_hint_ref: "audit-hint-001" });
  const readAudit = requireSensitiveReadAudit({ tenant_id: TENANT, actor_id: "user-001", resource_type: "document", audit_hint_ref: "audit-hint-002" });
  const correlation = createCorrelationContext({ "x-lawos-correlation-id": "corr-001" });
  const safeError = createSafeErrorEnvelope({ request_id: "req-001", safe_error_codes: ["PERMISSION_DENIED"], audit_hint_ref: "audit-hint-003" });

  assert.equal(writeAudit.writes_audit_event, true);
  assert.equal(writeAudit.production_ready_claim, false);
  assert.equal(readAudit.sensitive_read_audit_required, true);
  assert.equal(readAudit.production_ready_claim, false);
  assert.equal(correlation.correlation_id, "corr-001");
  assert.equal(correlation.causation_id, "corr-001");
  assert.equal(safeError.status, 400);
  assert.equal(safeError.body.count_leak_prevented, true);
  assert.deepEqual(safeError.body.items, []);
});

test("G1 permission simulator stays read-only while evaluating runtime permission", () => {
  const response = simulatePermissionReadOnly({
    principal: { tenant_id: TENANT, user_id: "user-001", role_ids: ["partner"] },
    resource: { tenant_id: TENANT, resource_type: "Matter", resource_id: "matter-001" },
    action: "matter.read",
    rules: [{ id: "rule-allow-partner", effect: "allow", role_id: "partner", action: "matter.read" }],
  });

  assert.equal(response.decision.effect, "allow");
  assert.equal(response.read_only, true);
  assert.equal(response.writes_product_state, false);
  assert.equal(response.production_ready_claim, false);
});

test("G1 audit export and verify helpers use tenant-scoped API shapes", () => {
  const calls = [];
  const auditStore = {
    exportTenant(input) {
      calls.push(["exportTenant", input]);
      return { tenant_id: input.tenant_id, events: [{ event_id: "evt-001" }], hash_chain_valid: true };
    },
    verifyTenant(input) {
      calls.push(["verifyTenant", input]);
      return true;
    },
  };

  const exported = createAuditExportResponse({ auditStore, tenant_id: TENANT });
  const verified = runAuditVerifyJob({ auditStore, tenant_id: TENANT });

  assert.deepEqual(calls, [
    ["exportTenant", { tenant_id: TENANT }],
    ["verifyTenant", { tenant_id: TENANT }],
  ]);
  assert.equal(exported.outcome, "passed");
  assert.equal(exported.customer_payload_included, false);
  assert.equal(exported.production_ready_claim, false);
  assert.equal(verified.valid, true);
  assert.equal(verified.audit_verify_job, true);
  assert.equal(verified.production_ready_claim, false);
});

test("G1 secret guard blocks secret-shaped payloads before evidence export", () => {
  assert.deepEqual(assertNoSecretMaterial({ tenant_id: TENANT, claim: "no credential material" }), {
    secret_material_detected: false,
    production_ready_claim: false,
  });
  assert.throws(() => assertNoSecretMaterial({ api_key: "sk-abc123" }), /secret material detected/);
  assert.throws(() => assertNoSecretMaterial({ nested: { private_key: "BEGIN" } }), /secret material detected/);
});
