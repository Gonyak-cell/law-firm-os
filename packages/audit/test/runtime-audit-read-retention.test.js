import assert from "node:assert/strict";
import test from "node:test";
import {
  canPurgeAuditEvent,
  createRuntimeAuditReader,
  createRuntimeAuditWriter,
  denyRuntimeAuditMutation,
  runAuditVerifyJob
} from "../src/index.js";

const principal = Object.freeze({
  source: "server-derived",
  header_only_trust_allowed: false,
  tenant_id: "tenant-a",
  user_id: "user-a",
  actor_type: "user",
  request_id: "req-a"
});

test("Runtime audit reader exports tenant-scoped metadata without raw payloads", () => {
  const writer = createRuntimeAuditWriter();
  writer.append({
    principal,
    resource: { resource_id: "matter-a", resource_type: "Matter", tenant_id: "tenant-a", matter_id: "matter-a" },
    action: "runtime.read",
    decision: { effect: "allow" },
    permission_context_id: "perm-read",
    request: { request_id: "req-read" }
  });
  const reader = createRuntimeAuditReader({ writer });
  const exported = reader.exportTenant({ principal, tenant_id: "tenant-a" });
  assert.equal(exported.event_count, 1);
  assert.equal(exported.raw_payload_included, false);
  assert.throws(() => reader.listTenant({ principal, tenant_id: "tenant-b" }), /tenant mismatch/);
});

test("Runtime audit retention and verification preserve human approval and chain requirements", () => {
  const writer = createRuntimeAuditWriter();
  writer.append({
    principal,
    resource: { resource_id: "audit-a", resource_type: "AuditEvent", tenant_id: "tenant-a" },
    action: "retention.evaluate",
    decision: { effect: "allow" },
    permission_context_id: "perm-retention",
    request: { request_id: "req-retention", retention_policy_id: "retention-standard" }
  });

  const verify = runAuditVerifyJob({ auditStore: { verifyTenant: writer.verify, listAudit: writer.list }, tenant_id: "tenant-a" });
  assert.equal(verify.audit_verify_job, true);
  assert.equal(verify.production_ready_claim, false);
  assert.equal(canPurgeAuditEvent({ retention_expired: true, active_legal_hold: false, chain_verified: true, human_approval: false }).reason, "human_approval_required");
  assert.throws(() => denyRuntimeAuditMutation(), /append-only/);
});
