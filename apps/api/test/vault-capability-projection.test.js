import assert from "node:assert/strict";
import test from "node:test";

import {
  VAULT_CAPABILITY_DEFINITIONS,
  projectVaultCapabilities,
  resolveVaultCapabilityProjection,
} from "../src/vault-capability-projection.js";
import { createApiSessionAuth } from "../src/session-auth.js";
import { highestPrivilegeRegisteredAccount } from "../src/matter-vault-account-registry.js";

const capabilityIds = VAULT_CAPABILITY_DEFINITIONS.map(({ id }) => id);

function principal(scopes = []) {
  return {
    tenant_id: "tenant_amic",
    user_id: "user_amic",
    role_ids: ["system_super_admin"],
    scopes,
  };
}

function providerResult(capabilities = Object.fromEntries(capabilityIds.map((id) => [id, true]))) {
  return {
    authoritative: true,
    provider_state: "ready",
    tenant_binding_state: "bound",
    user_binding_state: "bound",
    authority_ref: "vault-capability-readback:revision-1",
    capabilities,
  };
}

function decisions(result) {
  return Object.fromEntries(result.capabilities.map((capability) => [capability.id, capability]));
}

test("missing Vault authority denies every stable capability without exposing roles or policy", () => {
  const result = projectVaultCapabilities({
    principal: principal(["vault.read", "vault.write", "vault.governance", "audit.read"]),
  });
  assert.deepEqual(result.capabilities.map(({ id }) => id), capabilityIds);
  assert.ok(result.capabilities.every((capability) => (
    capability.allowed === false
    && capability.decision === "deny"
    && capability.safe_reason_code === "VAULT_AUTHORITY_UNAVAILABLE"
  )));
  assert.equal(result.authoritative, false);
  assert.equal(result.denied_by_default, true);
  assert.equal(result.client_must_not_infer_from_roles, true);
  assert.equal(result.role_names_returned, false);
  assert.equal(result.raw_policy_returned, false);
  assert.equal(result.token_material_returned, false);
  assert.equal(result.production_ready_claim, false);
});

test("server projection intersects verified session scopes with authoritative Vault capabilities", () => {
  const result = projectVaultCapabilities({
    principal: principal(["vault.read"]),
    providerResult: providerResult(),
  });
  const byId = decisions(result);
  for (const id of ["read", "download", "attach"]) {
    assert.equal(byId[id].allowed, true, id);
    assert.equal(byId[id].safe_reason_code, null, id);
  }
  for (const id of ["upload", "work", "governance", "audit"]) {
    assert.equal(byId[id].allowed, false, id);
    assert.equal(byId[id].safe_reason_code, "VAULT_SCOPE_NOT_GRANTED", id);
  }
  assert.equal(result.authoritative, true);
  assert.equal("required_scope" in byId.read, false);
  assert.equal(JSON.stringify(result).includes("system_super_admin"), false);
});

test("provider denial wins even when the verified session has the local scope", () => {
  const providerCapabilities = Object.fromEntries(capabilityIds.map((id) => [id, true]));
  providerCapabilities.attach = false;
  const result = projectVaultCapabilities({
    principal: principal(["vault.read", "vault.write", "vault.governance", "audit.read"]),
    providerResult: providerResult(providerCapabilities),
  });
  const byId = decisions(result);
  assert.equal(byId.attach.allowed, false);
  assert.equal(byId.attach.safe_reason_code, "VAULT_CAPABILITY_NOT_GRANTED");
  assert.equal(byId.read.allowed, true);
  assert.equal(byId.upload.allowed, true);
});

test("unbound tenant or user denies the complete projection", () => {
  for (const field of ["tenant_binding_state", "user_binding_state"]) {
    const provider = providerResult();
    provider[field] = "unbound";
    const result = projectVaultCapabilities({
      principal: principal(["vault.read", "vault.write", "vault.governance", "audit.read"]),
      providerResult: provider,
    });
    assert.equal(result.authoritative, false);
    assert.ok(result.capabilities.every((item) => item.safe_reason_code === "VAULT_IDENTITY_UNBOUND"));
  }
});

test("resolver receives only server identity refs and failures remain fail-closed", async () => {
  let received;
  const result = await resolveVaultCapabilityProjection({
    principal: {
      ...principal(["vault.read"]),
      email: "must-not-cross@example.invalid",
      session_token: "must-not-cross",
    },
    request_id: "req-capability-1",
    resolver: async (input) => {
      received = input;
      return providerResult();
    },
  });
  assert.deepEqual(received, {
    tenant_id: "tenant_amic",
    user_id: "user_amic",
    request_id: "req-capability-1",
  });
  assert.equal(result.authoritative, true);

  const failed = await resolveVaultCapabilityProjection({
    principal: principal(["vault.read"]),
    resolver: async () => { throw new Error("provider secret details"); },
  });
  assert.ok(failed.capabilities.every((item) => item.safe_reason_code === "VAULT_AUTHORITY_UNAVAILABLE"));
  assert.equal(JSON.stringify(failed).includes("provider secret details"), false);
});

test("signed session endpoint returns the server-owned projection and never role-derived allow", async () => {
  const account = highestPrivilegeRegisteredAccount();
  const resolverCalls = [];
  const auth = createApiSessionAuth({
    secret: "vault-capability-session-test",
    vaultCapabilityResolver: async (input) => {
      resolverCalls.push(input);
      return providerResult();
    },
  });
  const login = await auth.login({
    email: account.email,
    password: account.local_dev.synthetic_token,
  }, { requestId: "req-cap-login" });
  assert.equal(login.status, 200);
  const session = await auth.handleAuthApiRequest({
    pathname: "/api/auth/session",
    method: "GET",
    headers: { authorization: `Bearer ${login.body.session_token}` },
    requestId: "req-cap-session",
  });
  assert.equal(session.status, 200);
  assert.equal(session.body.vault_capabilities.authoritative, true);
  assert.deepEqual(session.body.vault_capabilities.capabilities.map(({ id }) => id), capabilityIds);
  assert.deepEqual(resolverCalls, [{
    tenant_id: session.body.session.tenant_id,
    user_id: session.body.session.user_id,
    request_id: "req-cap-session",
  }]);
  assert.equal(session.body.vault_capabilities.role_names_returned, false);

  const withoutProvider = createApiSessionAuth({ secret: "vault-capability-no-provider" });
  const deniedLogin = await withoutProvider.login({
    email: account.email,
    password: account.local_dev.synthetic_token,
  }, { requestId: "req-cap-denied-login" });
  const deniedSession = await withoutProvider.handleAuthApiRequest({
    pathname: "/api/auth/session",
    method: "GET",
    headers: { authorization: `Bearer ${deniedLogin.body.session_token}` },
    requestId: "req-cap-denied-session",
  });
  assert.ok(deniedSession.body.vault_capabilities.capabilities.every((item) => item.allowed === false));
});
