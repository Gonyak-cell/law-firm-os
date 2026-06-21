import assert from "node:assert/strict";
import test from "node:test";
import { createLocalDevAuthProvider, deriveServerPrincipal, resolveTenantMembership, resolveRolesAndGroups } from "../src/index.js";

function provider() {
  return createLocalDevAuthProvider({
    subjects: [
      {
        synthetic_token: "token-a",
        user_id: "user-a",
        assurance_level: "mfa",
        tenant_memberships: [
          { tenant_id: "tenant-a", role_ids: ["attorney"], group_ids: ["matters"], scopes: ["matter.read", "hr.read"] }
        ]
      }
    ]
  });
}

test("Server-derived principal ignores caller tenant and role headers by failing closed", () => {
  assert.throws(
    () =>
      deriveServerPrincipal({
        provider: provider(),
        trustedTenantId: "tenant-a",
        request: {
          headers: {
            authorization: "Bearer token-a",
            "x-tenant-id": "tenant-b"
          }
        }
      }),
    /caller-supplied trust context/,
  );
  assert.throws(
    () =>
      deriveServerPrincipal({
        provider: provider(),
        trustedTenantId: "tenant-a",
        request: { headers: { authorization: "Bearer token-a" }, query: { role_id: "admin" } }
      }),
    /caller-supplied trust context/,
  );
});

test("Server-derived principal resolves tenant membership, roles, groups, and scopes", () => {
  const principal = deriveServerPrincipal({
    provider: provider(),
    trustedTenantId: "tenant-a",
    request_id: "req-001",
    request: { headers: { authorization: "Bearer token-a" } }
  });

  assert.equal(principal.ok, true);
  assert.equal(principal.source, "server-derived");
  assert.equal(principal.header_only_trust_allowed, false);
  assert.deepEqual(principal.role_ids, ["attorney"]);
  assert.deepEqual(principal.group_ids, ["matters"]);
  assert.deepEqual(principal.scopes, ["matter.read", "hr.read"]);
});

test("Tenant membership resolver denies tenants absent from the authenticated session", () => {
  const auth = provider().authenticateRequest({ headers: { authorization: "Bearer token-a" } });
  const membership = resolveTenantMembership(auth.session, "tenant-b");
  assert.equal(membership.ok, false);
  assert.equal(membership.reason, "tenant_membership_missing");
  assert.deepEqual(resolveRolesAndGroups(auth.session.tenant_memberships[0]).role_ids, ["attorney"]);
});
