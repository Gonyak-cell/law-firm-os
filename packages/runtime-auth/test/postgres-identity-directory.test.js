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
  const existingSession = await ledger.completeLogin({
    tenant_id: tenantId,
    user: input.user,
    session_jti: "session-before-office-sso-binding",
    session_id: "session-id-before-office-sso-binding",
    credential_rev: account.credential_rev,
    issued_at: "2026-07-20T03:00:00.000Z",
    expires_at: "2026-07-20T04:00:00.000Z",
  });
  assert.equal(existingSession.ok, true);

  const primaryLoginLock = await ledger.recordLoginFailure({
    tenant_id: tenantId,
    user: input.user,
    max_failed_logins: 1,
    lock_ms: 60 * 60 * 1000,
  });
  assert.equal(primaryLoginLock.locked, true);

  const officeBound = await ledger.ensureFederatedAccount({
    tenant_id: tenantId,
    user: input.user,
    provider_id: "microsoft-office-naa-sso-test",
    federated_tenant_id: "11111111-1111-4111-8111-111111111111",
    federated_subject_id: "22222222-2222-4222-8222-222222222222",
    actor_id: input.user.user_id,
    preserve_primary_credential: true,
    audit_action: "auth.office_sso_identity.bound",
  });
  assert.equal(officeBound.credential_provider, account.credential_provider);
  assert.equal(officeBound.credential_status, account.credential_status);
  assert.equal(officeBound.credential_rev, account.credential_rev);
  assert.deepEqual(officeBound.password_hash, account.password_hash);
  assert.equal(officeBound.failed_login_count, primaryLoginLock.count);
  assert.equal(officeBound.locked_until, primaryLoginLock.locked_until);
  assert.equal(
    officeBound.federated_tenant_id,
    "11111111-1111-4111-8111-111111111111",
  );
  assert.equal(
    officeBound.federated_subject_id,
    "22222222-2222-4222-8222-222222222222",
  );
  assert.equal(
    (await ledger.listSecurityAudit({ tenant_id: tenantId }))
      .some((event) => event.action === "auth.office_sso_identity.bound"),
    true,
  );
  assert.deepEqual(await ledger.validateSession({
    tenant_id: tenantId,
    session_jti: "session-before-office-sso-binding",
    user_id: input.user.user_id,
  }), {
    ok: true,
    user_id: input.user.user_id,
    credential_rev: account.credential_rev,
    credential_status: "active",
  });
  const lockedPasswordLogin = await ledger.completeLogin({
    tenant_id: tenantId,
    user: input.user,
    session_jti: "password-session-while-locked",
    session_id: "password-session-id-while-locked",
    credential_rev: account.credential_rev,
    issued_at: "2026-07-20T03:05:00.000Z",
    expires_at: "2026-07-20T04:05:00.000Z",
  });
  assert.equal(lockedPasswordLogin.safe_error_code, "AUTH_LOGIN_LOCKED");

  const officeSession = await ledger.completeLogin({
    tenant_id: tenantId,
    user: input.user,
    session_jti: "office-session-while-password-locked",
    session_id: "office-session-id-while-password-locked",
    credential_rev: account.credential_rev,
    issued_at: "2026-07-20T03:05:00.000Z",
    expires_at: "2026-07-20T04:05:00.000Z",
    preserve_login_failure_state: true,
  });
  assert.equal(officeSession.ok, true);
  assert.deepEqual(await ledger.validateSession({
    tenant_id: tenantId,
    session_jti: "office-session-while-password-locked",
    user_id: input.user.user_id,
  }), {
    ok: true,
    user_id: input.user.user_id,
    credential_rev: account.credential_rev,
    credential_status: "active",
  });
  const afterOfficeSession = await ledger.getAccount({
    tenant_id: tenantId,
    user_id: input.user.user_id,
  });
  assert.equal(afterOfficeSession.failed_login_count, primaryLoginLock.count);
  assert.equal(afterOfficeSession.locked_until, primaryLoginLock.locked_until);
  await assert.rejects(
    ledger.ensureFederatedAccount({
      tenant_id: tenantId,
      user: input.user,
      provider_id: "microsoft-office-naa-sso-test",
      federated_tenant_id: "11111111-1111-4111-8111-111111111111",
      federated_subject_id: "33333333-3333-4333-8333-333333333333",
      actor_id: input.user.user_id,
      preserve_primary_credential: true,
    }),
    (error) => error.safe_error_code === "FEDERATED_IDENTITY_CONFLICT",
  );
  const afterConflict = await ledger.getAccount({
    tenant_id: tenantId,
    user_id: input.user.user_id,
  });
  for (const field of [
    "credential_provider",
    "credential_status",
    "credential_rev",
    "federated_tenant_id",
    "federated_subject_id",
  ]) {
    assert.equal(afterConflict[field], officeBound[field]);
  }
  assert.deepEqual(afterConflict.password_hash, officeBound.password_hash);

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
