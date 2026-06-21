import assert from "node:assert/strict";
import test from "node:test";
import {
  buildRuntimeAuthzContext,
  createLocalDevAuthProvider,
  deriveServerPrincipal,
  evaluateRuntimePermission,
  requireAssurance
} from "../src/index.js";

function principal({ assurance_level = "mfa", scopes = ["matter.read", "hr.read"] } = {}) {
  const provider = createLocalDevAuthProvider({
    subjects: [
      {
        synthetic_token: "token-a",
        user_id: "user-a",
        assurance_level,
        tenant_memberships: [{ tenant_id: "tenant-a", role_ids: ["attorney"], scopes }]
      }
    ]
  });
  return deriveServerPrincipal({
    provider,
    trustedTenantId: "tenant-a",
    request_id: "req-ctx",
    request: { headers: { authorization: "Bearer token-a" } }
  });
}

test("AuthZ context builder requires server-derived principal", () => {
  const context = buildRuntimeAuthzContext({
    principal: { user_id: "caller", tenant_id: "tenant-a", role_ids: ["attorney"] },
    resource: { resource_id: "matter-a", resource_type: "Matter", tenant_id: "tenant-a" },
    action: "matter.read"
  });
  assert.equal(context.ok, false);
  assert.equal(context.reason, "server_derived_principal_required");
});

test("Runtime permission integrates existing authz evaluator and denies cross-tenant resources", () => {
  const actor = principal();
  const allow = evaluateRuntimePermission({
    principal: actor,
    resource: { resource_id: "matter-a", resource_type: "Matter", tenant_id: "tenant-a" },
    action: "matter.read",
    rules: [{ effect: "allow", role_id: "attorney", resource_type: "Matter", action: "matter.read" }]
  });
  assert.equal(allow.effect, "allow");
  assert.equal(allow.server_derived_principal, true);
  assert.match(allow.runtime_authz_context_id, /tenant-a:user-a:matter.read/);

  const deny = evaluateRuntimePermission({
    principal: actor,
    resource: { resource_id: "matter-b", resource_type: "Matter", tenant_id: "tenant-b" },
    action: "matter.read",
    rules: [{ effect: "allow", role_id: "attorney", resource_type: "Matter", action: "matter.read" }]
  });
  assert.equal(deny.effect, "deny");
  assert.equal(deny.reason, "cross_tenant_deny");
  assert.equal(deny.audit_hint.object_id, "redacted_cross_tenant_object");
});

test("Sensitive policy hooks require step-up assurance and HR scope", () => {
  const lowAssurance = principal({ assurance_level: "password" });
  const privileged = evaluateRuntimePermission({
    principal: lowAssurance,
    resource: { resource_id: "doc-a", resource_type: "Document", tenant_id: "tenant-a", data_classification: "privileged" },
    action: "document.view",
    rules: [{ effect: "allow", role_id: "attorney", resource_type: "Document", action: "document.view" }]
  });
  assert.equal(privileged.effect, "deny");
  assert.equal(privileged.reason, "privileged_step_up_required");
  assert.equal(requireAssurance(lowAssurance, "mfa").reason, "step_up_required");

  const noHrScope = principal({ scopes: ["matter.read"] });
  const hr = evaluateRuntimePermission({
    principal: noHrScope,
    resource: { resource_id: "employee-a", resource_type: "Employee", tenant_id: "tenant-a", data_classification: "hr-sensitive" },
    action: "employee.read",
    rules: [{ effect: "allow", role_id: "attorney", resource_type: "Employee", action: "employee.read" }]
  });
  assert.equal(hr.effect, "deny");
  assert.equal(hr.reason, "hr_sensitive_scope_required");
});
