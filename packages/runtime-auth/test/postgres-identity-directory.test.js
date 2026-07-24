import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import test from "node:test";
import { createMigratedPostgresFixture } from "../../persistence/test/helpers/disposable-postgres.js";
import { createPostgresIdentityLedger } from "../src/postgres-identity-ledger.js";

test("PostgreSQL identity directory is tenant-scoped, replay-safe and never exposes password hashes", async (t) => {
  const fixture = await createMigratedPostgresFixture(t);
  if (!fixture) return;
  const tenantId = "tenant_directory_alpha";
  const otherTenantId = "tenant_directory_beta";
  const ledger = createPostgresIdentityLedger({
    pool: fixture.appPool,
    clock: () => Date.parse("2026-07-20T03:00:00.000Z"),
  });
  const input = {
    tenant_id: tenantId,
    actor_id: "migration_operator",
    data_scope: "synthetic-only",
    idempotency_key: "directory-provision-user-001-v1",
    request_hash: createHash("sha256").update("directory-provision-user-001-v1").digest("hex"),
    user: {
      user_id: "user_directory_001",
      email: "Staff.One@Example.com",
      status: "active",
      display_name: "Synthetic Staff One",
      source_title: "Attorney",
      roster_link_status: "pending-roster-link",
      login_allowed: false,
      identity_setup_allowed: false,
      access_grant_allowed: false,
      source_ref: "synthetic-directory-v1",
    },
    membership: {
      status: "active",
      role_profile_id: "lawos_staff",
      role_ids: ["lawos_staff"],
      group_ids: ["legal"],
      scopes: ["matter:read"],
      hrx_scopes: ["hrx:self"],
      source_ref: "synthetic-membership-v1",
    },
  };

  const created = await ledger.provisionDirectoryUser(input);
  assert.equal(created.replayed, false);
  assert.equal(created.user.email, "staff.one@example.com");
  assert.equal(created.user.credential_status, "reset_required");
  assert.equal(created.user.directory_source, "postgres-v2");
  assert.equal(created.user.tenant_memberships[0].state_version, 1);
  assert.equal(created.user.directory_state_version, 1);
  assert.deepEqual(created.user.role_ids, ["lawos_staff"]);
  assert.equal(created.user.profile.roster_link_status, "pending-roster-link");
  assert.equal(created.user.profile.login_allowed, false);
  assert.equal(created.user.profile.identity_setup_allowed, false);
  assert.equal(created.user.profile.access_grant_allowed, false);
  assert.equal(created.idempotency_replayed, false);
  assert.equal(created.outbox.replayed, false);
  assert.equal(Object.hasOwn(created.user, "password_hash"), false);

  const replayed = await ledger.provisionDirectoryUser(input);
  assert.equal(replayed.replayed, true);
  assert.equal(replayed.idempotency_replayed, true);
  assert.equal(replayed.outbox.replayed, true);
  assert.equal(replayed.user.tenant_memberships[0].state_version, 1);
  assert.equal((await ledger.listSecurityAudit({ tenant_id: tenantId })).filter((event) => event.action === "auth.directory.user.provisioned").length, 1);
  assert.equal((await ledger.listDirectoryIdempotency({ tenant_id: tenantId })).length, 1);
  assert.equal((await ledger.listDirectoryOutbox({ tenant_id: tenantId })).length, 1);

  const byEmail = await ledger.findDirectoryUserByEmail({ tenant_id: tenantId, email: "STAFF.ONE@EXAMPLE.COM" });
  const byId = await ledger.findDirectoryUserByUserId({ tenant_id: tenantId, user_id: input.user.user_id });
  assert.equal(byEmail.user_id, input.user.user_id);
  assert.deepEqual(byId, byEmail);
  assert.deepEqual(await ledger.listDirectoryUsers({ tenant_id: tenantId }), [byEmail]);
  assert.equal(await ledger.findDirectoryUserByEmail({ tenant_id: otherTenantId, email: input.user.email }), null);
  assert.deepEqual(await ledger.listDirectoryUsers({ tenant_id: otherTenantId }), []);

  const changed = await ledger.provisionDirectoryUser({
    ...input,
    idempotency_key: "directory-provision-user-001-v2",
    request_hash: createHash("sha256").update("directory-provision-user-001-v2").digest("hex"),
    membership: { ...input.membership, role_ids: ["lawos_staff", "matter_manager"] },
  });
  assert.equal(changed.replayed, false);
  assert.equal(changed.account_changed, false);
  assert.equal(changed.membership_changed, true);
  assert.equal(changed.user.tenant_memberships[0].state_version, 2);
  assert.equal(changed.outbox.replayed, false);
  assert.equal((await ledger.listDirectoryOutbox({ tenant_id: tenantId })).length, 2);

  await ledger.setCredential({
    tenant_id: tenantId,
    user: input.user,
    provider_id: "lawos-internal-password-provider-v1",
    password_hash: { algorithm: "synthetic-test-hash", digest: "not-a-real-password" },
    status: "active",
  });
  await ledger.provisionDirectoryUser({
    ...input,
    idempotency_key: "directory-provision-user-001-v3",
    request_hash: createHash("sha256").update("directory-provision-user-001-v3").digest("hex"),
    membership: { ...input.membership, role_ids: ["lawos_staff", "matter_manager"] },
  });
  const account = await ledger.getAccount({ tenant_id: tenantId, user_id: input.user.user_id });
  assert.equal(account.credential_status, "active");
  assert.equal(account.password_hash.algorithm, "synthetic-test-hash");

  await assert.rejects(ledger.provisionDirectoryUser({
    ...input,
    idempotency_key: "directory-provision-user-sensitive-profile",
    request_hash: createHash("sha256").update("directory-provision-user-sensitive-profile").digest("hex"),
    user: {
      ...input.user,
      profile: {
        display_name: "Unsafe profile",
        professional_profile: { api_key: "must-not-persist" },
      },
    },
  }), /forbidden sensitive material/u);
});
