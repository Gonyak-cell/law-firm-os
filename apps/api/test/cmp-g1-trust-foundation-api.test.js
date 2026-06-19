// Deterministic in-process tests for the CMP-G1 trust foundation runtime slice.
import test from "node:test";
import assert from "node:assert/strict";
import { startApiServer } from "../src/server.js";

const TENANT = "tenant_cmp_g1_synthetic";
const OTHER_TENANT = "tenant_cmp_g1_other";

let server;
let baseUrl;
let firstDecisionReceipt;

async function get(path) {
  const res = await fetch(`${baseUrl}${path}`);
  return { status: res.status, body: await res.json() };
}

async function post(path, body) {
  const res = await fetch(`${baseUrl}${path}`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
  return { status: res.status, body: await res.json() };
}

function principal(overrides = {}) {
  return {
    user_id: "user_cmp_g1_owner",
    tenant_id: TENANT,
    role_ids: ["matter_team"],
    ...overrides,
  };
}

function resource(overrides = {}) {
  return {
    resource_id: "matter_record_cmp_g1_001",
    resource_type: "MatterRecord",
    tenant_id: TENANT,
    matter_id: "matter_cmp_g1_001",
    ...overrides,
  };
}

function allowRule(action = "matter.read", overrides = {}) {
  return {
    id: `rule_allow_${action.replaceAll(".", "_")}`,
    effect: "allow",
    action,
    role_id: "matter_team",
    ...overrides,
  };
}

test.before(async () => {
  const started = await startApiServer({ port: 0 });
  server = started.server;
  baseUrl = `http://${started.host}:${started.port}`;
});

test.after(() => new Promise((resolve) => server.close(resolve)));

test("CMP-G1 health descriptor exposes trust foundation without claiming durable R4 readiness", async () => {
  const { status, body } = await get("/api/health");
  assert.equal(status, 200);
  const trust = body.bounded_contexts.find((context) => context.bounded_context === "trust-foundation");
  assert.ok(trust);
  assert.equal(trust.cmp_gate, "CMP-G1");
  assert.equal(trust.cmp_work_package, "CMP-G1-W01");
  assert.equal(trust.tuw_ids.length, 24);
  assert.equal(trust.tuw_ids[0], "CMP-G1-W01-T001");
  assert.equal(trust.tuw_ids.at(-1), "CMP-G1-W01-T024");
  assert.equal(trust.runtime_readiness_claim, "runtime_api_evidence_only__durable_persistence_open");
});

test("CMP-G1 evaluates allow decisions, persists permission context, and emits audit evidence", async () => {
  const { status, body } = await post("/permissions/evaluate", {
    request: { request_id: "req_cmp_g1_allow", trace_id: "trace_cmp_g1_allow" },
    principal: principal(),
    resource: resource(),
    action: "matter.read",
    rules: [allowRule("matter.read")],
  });

  assert.equal(status, 200);
  assert.equal(body.outcome, "allow");
  assert.equal(body.ok, true);
  assert.ok(body.permission_context_id);
  assert.ok(body.decision.permission_decision_id);
  assert.ok(body.audit_event_id);
  assert.equal(body.tuw_ids.length, 24);
  assert.ok(body.tuw_ids.includes("CMP-G1-W01-T014"));
  assert.equal(body.runtime_readiness, "runtime_api_evidence_only__durable_persistence_open");
  firstDecisionReceipt = body.decision_receipt;

  const contexts = await get(`/permissions/contexts?tenant_id=${TENANT}`);
  assert.equal(contexts.status, 200);
  assert.ok(contexts.body.items.some((item) => item.permission_context_id === body.permission_context_id));
});

test("CMP-G1 denies over allow and records a safe permission denial", async () => {
  const { status, body } = await post("/permissions/evaluate", {
    request: { request_id: "req_cmp_g1_deny_over_allow" },
    principal: principal(),
    resource: resource({ resource_id: "matter_record_cmp_g1_restricted" }),
    action: "matter.read",
    rules: [
      { id: "rule_deny_restricted", effect: "deny", action: "matter.read", reason: "restricted_matter" },
      allowRule("matter.read"),
    ],
  });

  assert.equal(status, 403);
  assert.equal(body.outcome, "deny");
  assert.equal(body.decision.reason, "restricted_matter");
  assert.deepEqual(body.safe_error_codes, ["CMP_G1_PERMISSION_DENIED"]);
  assert.ok(body.audit_event_id);
});

test("CMP-G1 fails closed on cross-tenant access before allow rules can match", async () => {
  const { status, body } = await post("/permissions/evaluate", {
    request: { request_id: "req_cmp_g1_cross_tenant" },
    principal: principal({ tenant_id: OTHER_TENANT }),
    resource: resource(),
    action: "matter.read",
    rules: [allowRule("matter.read")],
  });

  assert.equal(status, 403);
  assert.equal(body.outcome, "deny");
  assert.equal(body.decision.reason, "cross_tenant_deny");
  assert.equal(body.decision.matched_rule_id, "permission_context_guard");
});

test("CMP-G1 stores policies and uses them through the permission simulator", async () => {
  const policy = await post("/admin/policies", {
    tenant_id: TENANT,
    id: "policy_cmp_g1_stored_allow",
    effect: "allow",
    action: "matter.edit",
    role_id: "matter_editor",
  });
  assert.equal(policy.status, 201);

  const simulated = await post("/admin/permission-simulator", {
    request: { request_id: "req_cmp_g1_policy_simulator" },
    principal: principal({ user_id: "user_cmp_g1_editor", role_ids: ["matter_editor"] }),
    resource: resource({ resource_id: "matter_record_cmp_g1_edit" }),
    action: "matter.edit",
  });
  assert.equal(simulated.status, 200);
  assert.equal(simulated.body.outcome, "allow");
  assert.equal(simulated.body.decision.matched_rule_id, "policy_cmp_g1_stored_allow");
  assert.equal(simulated.body.decision_receipt.simulator, true);

  const policies = await get(`/admin/policies?tenant_id=${TENANT}`);
  assert.ok(policies.body.items.some((item) => item.id === "policy_cmp_g1_stored_allow"));
});

test("CMP-G1 stored policies are tenant scoped during evaluation", async () => {
  const shadowPolicy = await post("/admin/policies", {
    tenant_id: OTHER_TENANT,
    id: "policy_cmp_g1_other_tenant_deny",
    effect: "deny",
    action: "matter.read",
    reason: "other_tenant_shadow_policy",
  });
  assert.equal(shadowPolicy.status, 201);

  const evaluated = await post("/permissions/evaluate", {
    request: { request_id: "req_cmp_g1_tenant_scoped_policy" },
    principal: principal(),
    resource: resource({ resource_id: "matter_record_cmp_g1_policy_scope" }),
    action: "matter.read",
    rules: [allowRule("matter.read")],
  });
  assert.equal(evaluated.status, 200);
  assert.equal(evaluated.body.outcome, "allow");
  assert.notEqual(evaluated.body.decision.reason, "other_tenant_shadow_policy");

  const otherPolicies = await get(`/admin/policies?tenant_id=${OTHER_TENANT}`);
  assert.ok(otherPolicies.body.items.some((item) => item.id === "policy_cmp_g1_other_tenant_deny"));
});

test("CMP-G1 applies object ACLs and supports service principal actors", async () => {
  const acl = await post("/object-acl", {
    tenant_id: TENANT,
    id: "acl_cmp_g1_service_allow",
    effect: "allow",
    principal_id: "svc_cmp_g1_billing",
    action: "billing.audit.export",
  });
  assert.equal(acl.status, 201);

  const evaluated = await post("/permissions/evaluate", {
    request: { request_id: "req_cmp_g1_service_principal" },
    principal: {
      service_principal_id: "svc_cmp_g1_billing",
      tenant_id: TENANT,
      role_ids: ["service_principal"],
    },
    resource: resource({ resource_id: "billing_export_cmp_g1_001", resource_type: "BillingExport" }),
    action: "billing.audit.export",
  });
  assert.equal(evaluated.status, 200);
  assert.equal(evaluated.body.outcome, "allow");
  assert.equal(evaluated.body.decision.reason, "object_acl_allow");
  assert.equal(evaluated.body.decision.matched_rule_id, "acl_cmp_g1_service_allow");
});

test("CMP-G1 ethical walls and legal holds deny otherwise allowed access", async () => {
  const wall = await post("/admin/ethical-walls", {
    tenant_id: TENANT,
    id: "wall_cmp_g1_blocked_matter",
    matter_id: "matter_cmp_g1_wall",
    blocked_user_ids: ["user_cmp_g1_walled"],
  });
  assert.equal(wall.status, 201);

  const walled = await post("/permissions/evaluate", {
    request: { request_id: "req_cmp_g1_ethical_wall" },
    principal: principal({ user_id: "user_cmp_g1_walled" }),
    resource: resource({ resource_id: "matter_record_cmp_g1_wall", matter_id: "matter_cmp_g1_wall" }),
    action: "matter.read",
    rules: [allowRule("matter.read")],
  });
  assert.equal(walled.status, 403);
  assert.equal(walled.body.decision.reason, "ethical_wall");

  const hold = await post("/admin/legal-holds", {
    tenant_id: TENANT,
    id: "hold_cmp_g1_document_delete",
    resource_id: "knowledge_cmp_g1_held",
    active: true,
  });
  assert.equal(hold.status, 201);

  const held = await post("/permissions/evaluate", {
    request: { request_id: "req_cmp_g1_legal_hold" },
    principal: principal(),
    resource: resource({ resource_id: "knowledge_cmp_g1_held", resource_type: "KnowledgeObject" }),
    action: "document.delete",
    rules: [allowRule("document.delete")],
  });
  assert.equal(held.status, 403);
  assert.equal(held.body.decision.reason, "legal_hold");
});

test("CMP-G1 break-glass requires reason, approval, and audit intent before allow", async () => {
  const incomplete = await post("/permissions/evaluate", {
    request: { request_id: "req_cmp_g1_break_glass_missing" },
    principal: principal({ user_id: "user_cmp_g1_breakglass", actor_type: "break_glass_admin" }),
    resource: resource({ resource_id: "matter_record_cmp_g1_breakglass" }),
    action: "matter.break_glass.read",
    break_glass: { requested: true, reason: "emergency matter continuity" },
  });
  assert.equal(incomplete.status, 403);
  assert.equal(incomplete.body.decision.reason, "break_glass_incomplete");

  const complete = await post("/permissions/evaluate", {
    request: { request_id: "req_cmp_g1_break_glass_complete" },
    principal: principal({ user_id: "user_cmp_g1_breakglass", actor_type: "break_glass_admin" }),
    resource: resource({ resource_id: "matter_record_cmp_g1_breakglass" }),
    action: "matter.break_glass.read",
    break_glass: {
      requested: true,
      reason: "emergency matter continuity",
      approval_id: "approval_cmp_g1_breakglass",
      audit_required: true,
    },
  });
  assert.equal(complete.status, 200);
  assert.equal(complete.body.outcome, "allow");
  assert.equal(complete.body.decision.matched_rule_id, "break_glass_approval");
});

test("CMP-G1 records sensitive reads and verifies tenant-scoped audit chain", async () => {
  assert.ok(firstDecisionReceipt);
  const sensitive = await post("/audit/sensitive-read", {
    actor: {
      actor_id: firstDecisionReceipt.actor_id,
      actor_type: "user",
      tenant_id: TENANT,
    },
    object: {
      object_id: "contact_point_cmp_g1_sensitive",
      object_type: "ContactPoint",
      payload_digest: "sha256:contact-point-synthetic-digest",
    },
    permission_decision: firstDecisionReceipt,
    request: { request_id: "req_cmp_g1_sensitive_read", trace_id: "trace_cmp_g1_sensitive" },
    evidence_refs: ["apps/api/test/cmp-g1-trust-foundation-api.test.js"],
  });
  assert.equal(sensitive.status, 201);
  assert.equal(sensitive.body.outcome, "passed");
  assert.equal(sensitive.body.sensitive_read_receipt.permission_decision_id, firstDecisionReceipt.permission_decision_id);

  const exportEvents = await get(`/audit/events/export?tenant_id=${TENANT}`);
  assert.equal(exportEvents.status, 200);
  assert.ok(exportEvents.body.items.length >= 8);
  assert.ok(exportEvents.body.items.some((event) => event.action === "ContactPoint.sensitive_read"));

  const verification = await get(`/audit/verify?tenant_id=${TENANT}`);
  assert.equal(verification.status, 200);
  assert.equal(verification.body.verification.ok, true);
  assert.ok(verification.body.verification.checked >= 8);
});
