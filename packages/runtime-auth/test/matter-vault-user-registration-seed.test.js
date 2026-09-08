import assert from "node:assert/strict";
import test from "node:test";
import { createLocalDevAuthProvider, deriveServerPrincipal } from "../src/index.js";
import { createSyntheticPrivateRuntimeSources } from "../../../scripts/test/helpers/synthetic-private-runtime-sources.mjs";

const { registration: seed } = createSyntheticPrivateRuntimeSources();

function subjectsFromSeed() {
  return seed.users.map((user) => ({
    synthetic_token: user.local_dev.synthetic_token,
    user_id: user.user_id,
    auth_subject: user.email,
    assurance_level: user.assurance_level,
    tenant_memberships: user.tenant_memberships,
  }));
}

test("Matter-Vault registration authenticates every synthetic account cohort", () => {
  const provider = createLocalDevAuthProvider({ subjects: subjectsFromSeed() });

  for (const user of seed.users) {
    const homeTenantId = user.tenant_memberships[0].tenant_id;
    const principal = deriveServerPrincipal({
      provider,
      trustedTenantId: homeTenantId,
      request_id: `req-${user.user_id}`,
      request: { headers: { authorization: `Bearer ${user.local_dev.synthetic_token}` } },
    });

    assert.equal(principal.ok, true, `${user.email} should authenticate`);
    assert.equal(principal.user_id, user.user_id);
    assert.equal(principal.tenant_id, homeTenantId);
    assert.deepEqual(principal.role_ids, user.tenant_memberships[0].role_ids);
    assert.deepEqual(principal.group_ids, user.tenant_memberships[0].group_ids);
    assert.deepEqual(principal.scopes, user.tenant_memberships[0].scopes);
  }
});

test("member06@runtime.example.test is the only Matter-Vault highest privilege account", () => {
  const highest = seed.users.filter((user) => user.highest_privilege === true);

  assert.equal(highest.length, 1);
  assert.equal(highest[0].email, "member06@runtime.example.test");
  assert.equal(highest[0].privilege_rank, 1000);
  assert.ok(highest[0].role_ids.includes("system_super_admin"));
  assert.ok(highest[0].scopes.includes("security.admin"));
  assert.ok(highest[0].scopes.includes("user.admin"));

  for (const user of seed.users.filter((candidate) => candidate.email !== "member06@runtime.example.test")) {
    assert.equal(user.highest_privilege, false, `${user.email} must not be marked highest privilege`);
    assert.equal(user.role_ids.includes("system_super_admin"), false, `${user.email} must not be system_super_admin`);
    assert.ok(user.privilege_rank < 1000, `${user.email} must rank below member06@runtime.example.test`);
  }
});

test("Matter-Vault user registration seed excludes source phone numbers and real credentials", () => {
  const serialized = JSON.stringify(seed);

  assert.equal(seed.source.phone_numbers_imported, false);
  assert.equal(seed.registration_boundary.production_idp_account_creation, false);
  assert.equal(seed.registration_boundary.passwords_or_real_tokens_included, false);
  assert.equal(/(010|011|016|017|018|019)[- .]?\d{3,4}[- .]?\d{4}/.test(serialized), false);
  assert.equal(/(access_token|refresh_token|id_token|password)\s*[:=]/i.test(serialized), false);
});
