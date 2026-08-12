import assert from "node:assert/strict";
import test from "node:test";
import { createPostgresIdentityLedger } from "../../../packages/runtime-auth/src/postgres-identity-ledger.js";
import { createPostgresTenantProvisioningLedger } from "../../../packages/runtime-auth/src/postgres-tenant-provisioning.js";
import { createMigratedPostgresFixture } from "../../../packages/persistence/test/helpers/disposable-postgres.js";
import { withPostgresTransaction } from "../../../packages/persistence/src/postgres/transaction.js";
import {
  EXTERNAL_TENANT_PROVISIONING_SCHEMA_VERSION,
  assertTenantPinnedExternalRuntime,
  externalTenantProvisioningManifestSha256,
  normalizeExternalTenantProvisioningManifest,
  provisionExternalTenant,
} from "../src/external-tenant-provisioning.js";
import { ENTRA_OIDC_PROVIDER_ID } from "../src/entra-oidc-provider.js";
import { LAWOS_INTERNAL_PASSWORD_PROVIDER_ID } from "../src/auth-credential-store.js";
import { runClientOperationsPostgresMigrations } from "../src/client-operations-schema.js";
import { startApiServer } from "../src/server.js";

const TENANT_ID = "tenant_external_hanriver";
const ENTRA_TENANT_ID = "11111111-1111-4111-8111-111111111111";
const ADMIN_SUBJECT_ID = "22222222-2222-4222-8222-222222222222";
const INTERNAL_TENANT_ID = "tenant_external_mountain";

function manifest() {
  return {
    schema_version: EXTERNAL_TENANT_PROVISIONING_SCHEMA_VERSION,
    data_scope: "external-law-firm",
    idempotency_key: "external-pilot-20260812-001",
    operator_ref: "approved-operator-001",
    tenant: {
      tenant_id: TENANT_ID,
      display_name: "Han River Legal",
      deployment: {
        mode: "tenant-pinned",
        identity_tenant_id: TENANT_ID,
        database_tenant_id: TENANT_ID,
        staff_auth_authority: "entra-oidc",
        federated_tenant_id: ENTRA_TENANT_ID,
      },
    },
    members: [
      {
        user_id: "user_hanriver_admin",
        email: "admin@hanriver.example",
        display_name: "Named Pilot Admin",
        role_profile_id: "lawos_tenant_admin",
        role_ids: ["lawos_admin", "lawos_attorney"],
        group_ids: ["group_firm_leadership"],
        scopes: ["tenant.admin", "matter.read", "matter.write", "vault.read", "vault.write"],
        hrx_scopes: [],
        federated_subject_id: ADMIN_SUBJECT_ID,
      },
      {
        user_id: "user_hanriver_staff",
        email: "staff@hanriver.example",
        display_name: "Named Pilot Staff",
        role_profile_id: "lawos_staff",
        role_ids: ["lawos_staff"],
        group_ids: ["group_lawos_staff"],
        scopes: ["matter.read", "vault.read"],
        hrx_scopes: [],
      },
    ],
  };
}

function runtimeBinding() {
  return {
    deployment_mode: "tenant-pinned",
    identity_tenant_id: TENANT_ID,
    database_tenant_id: TENANT_ID,
    staff_auth_authority: "entra-oidc",
  };
}

function internalPasswordManifest() {
  return {
    schema_version: EXTERNAL_TENANT_PROVISIONING_SCHEMA_VERSION,
    data_scope: "external-law-firm",
    idempotency_key: "external-pilot-20260812-internal-001",
    operator_ref: "approved-operator-internal-001",
    tenant: {
      tenant_id: INTERNAL_TENANT_ID,
      display_name: "Mountain Legal",
      deployment: {
        mode: "tenant-pinned",
        identity_tenant_id: INTERNAL_TENANT_ID,
        database_tenant_id: INTERNAL_TENANT_ID,
        staff_auth_authority: "internal-password",
      },
    },
    members: [{
      user_id: "user_mountain_admin",
      email: "admin@mountain.example",
      display_name: "Named Mountain Admin",
      role_profile_id: "lawos_tenant_admin",
      role_ids: ["lawos_admin"],
      group_ids: [],
      scopes: ["tenant.admin", "matter.read"],
      hrx_scopes: [],
    }],
  };
}

function internalProvisioningOptions(input, fixture, overrides = {}) {
  return {
    manifest: input,
    expectedManifestSha256: externalTenantProvisioningManifestSha256(input),
    runtimeBinding: {
      deployment_mode: "tenant-pinned",
      identity_tenant_id: input.tenant.tenant_id,
      database_tenant_id: input.tenant.tenant_id,
      staff_auth_authority: input.tenant.deployment.staff_auth_authority,
    },
    adminPool: fixture.adminPool,
    appPool: fixture.appPool,
    tenantContextSecret: fixture.tenantContextSecret,
    clock: () => new Date("2026-08-12T02:20:00.000Z"),
    ...overrides,
  };
}

async function removeSyntheticWildcard(fixture) {
  await fixture.adminPool.query(
    "DELETE FROM lawos_security.tenant_context_authorities WHERE database_role = 'lawos_app' AND tenant_id = '*'",
  );
}

async function provisioningResidue(adminPool, tenantId) {
  return (await adminPool.query(
    `SELECT
       (SELECT count(*)::integer FROM lawos_security.tenant_context_authorities WHERE tenant_id = $1) AS authorities,
       (SELECT count(*)::integer FROM lawos_identity.tenants WHERE tenant_id = $1) AS tenants,
       (SELECT count(*)::integer FROM lawos_identity.tenant_provisioning_requests WHERE tenant_id = $1) AS requests,
       (SELECT count(*)::integer FROM lawos_identity.accounts WHERE tenant_id = $1) AS accounts,
       (SELECT count(*)::integer FROM lawos_identity.account_memberships WHERE tenant_id = $1) AS memberships,
       (SELECT count(*)::integer FROM lawos_identity.directory_idempotency_keys WHERE tenant_id = $1) AS member_requests,
       (SELECT count(*)::integer FROM lawos_identity.directory_outbox_events WHERE tenant_id = $1) AS outbox_events,
       (SELECT count(*)::integer FROM lawos_identity.security_audit_events WHERE tenant_id = $1) AS audit_events`,
    [tenantId],
  )).rows[0];
}

async function assertNoApplicationVisibility(appPool, tenantId) {
  await assert.rejects(
    withPostgresTransaction(appPool, { tenant_id: tenantId }, (client) => client.query(
      "SELECT count(*)::integer AS count FROM lawos_identity.accounts WHERE tenant_id = $1",
      [tenantId],
    )),
    (error) => error?.safe_error_code === "POSTGRES_ACCESS_DENIED" && error?.status === 403,
  );
}

test("external tenant provisioning is tenant-pinned, replay-safe, audited and emits only protected references", async (t) => {
  const fixture = await createMigratedPostgresFixture(t);
  if (!fixture) return;
  await runClientOperationsPostgresMigrations(fixture.adminPool);
  const input = manifest();
  const manifestHash = externalTenantProvisioningManifestSha256(input);
  const options = {
    manifest: input,
    expectedManifestSha256: manifestHash,
    runtimeBinding: runtimeBinding(),
    adminPool: fixture.adminPool,
    appPool: fixture.appPool,
    tenantContextSecret: fixture.tenantContextSecret,
    clock: () => new Date("2026-08-12T02:00:00.000Z"),
  };

  const receipt = await provisionExternalTenant(options);
  assert.equal(receipt.outcome, "completed");
  assert.equal(receipt.member_count, 2);
  assert.equal(receipt.prebound_federated_member_count, 1);
  assert.equal(receipt.runtime_binding.separate_deployment_required, true);
  assert.equal(receipt.runtime_binding.shared_multi_tenant_runtime, false);
  assert.equal(receipt.authentication_material_returned, false);
  assert.equal(receipt.pii_returned, false);
  assert.match(receipt.tenant_ref, /^tenant_sha256:[a-f0-9]{64}$/u);
  assert.deepEqual(await provisionExternalTenant(options), receipt);
  assert.deepEqual((await fixture.adminPool.query(
    `SELECT database_role, synthetic_wildcard, active
       FROM lawos_security.tenant_context_authorities
      WHERE tenant_id = $1
      ORDER BY database_role`,
    [TENANT_ID],
  )).rows, [{ database_role: "lawos_app", synthetic_wildcard: false, active: true }]);

  const receiptText = JSON.stringify(receipt);
  for (const protectedValue of [
    TENANT_ID,
    input.tenant.display_name,
    input.idempotency_key,
    input.operator_ref,
    ENTRA_TENANT_ID,
    ADMIN_SUBJECT_ID,
    fixture.tenantContextSecret,
    ...input.members.flatMap((member) => [member.user_id, member.email, member.display_name]),
  ]) {
    assert.equal(receiptText.includes(protectedValue), false, "receipt exposed protected provisioning input");
  }

  const identity = createPostgresIdentityLedger({ pool: fixture.appPool });
  const admin = await identity.findDirectoryUserByUserId({ tenant_id: TENANT_ID, user_id: input.members[0].user_id });
  const staff = await identity.findDirectoryUserByUserId({ tenant_id: TENANT_ID, user_id: input.members[1].user_id });
  assert.deepEqual(admin.scopes, ["matter.read", "matter.write", "tenant.admin", "vault.read", "vault.write"]);
  assert.equal(admin.credential_provider, ENTRA_OIDC_PROVIDER_ID);
  assert.equal(admin.credential_status, "active");
  assert.equal(staff.credential_status, "reset_required");
  const staffAccount = await identity.getAccount({ tenant_id: TENANT_ID, user_id: input.members[1].user_id });
  assert.equal(staffAccount.credential_provider, LAWOS_INTERNAL_PASSWORD_PROVIDER_ID);
  assert.equal(staffAccount.federated_tenant_id, null);
  assert.equal(staffAccount.federated_subject_id, null);
  assert.deepEqual(staffAccount.password_hash, {});
  assert.equal(
    await identity.findDirectoryUserByUserId({
      tenant_id: "tenant_external_other",
      user_id: input.members[0].user_id,
    }),
    null,
  );

  const tenantLedger = createPostgresTenantProvisioningLedger({ pool: fixture.appPool });
  assert.equal("begin" in tenantLedger, false);
  assert.equal("complete" in tenantLedger, false);
  const tenant = await tenantLedger.getTenant({ tenant_id: TENANT_ID });
  assert.equal(tenant.status, "active");
  assert.equal(tenant.member_count, 2);
  assert.equal(tenant.deployment_mode, "tenant-pinned");
  assert.deepEqual(await assertTenantPinnedExternalRuntime({
    tenantLedger,
    identityTenantId: TENANT_ID,
    databaseTenantId: TENANT_ID,
    deploymentMode: "tenant-pinned",
    staffAuthAuthority: "entra-oidc",
    staffOidcProvider: { federated_tenant_id: ENTRA_TENANT_ID },
  }), {
    registered: true,
    active: true,
    tenant_ref: receipt.tenant_ref,
    deployment_mode: "tenant-pinned",
    shared_multi_tenant_runtime: false,
  });
  assert.deepEqual(await assertTenantPinnedExternalRuntime({
    tenantLedger,
    identityTenantId: "tenant_external_unregistered",
    databaseTenantId: "tenant_external_unregistered",
    deploymentMode: null,
    staffAuthAuthority: "internal-password",
  }), { registered: false });
  await assert.rejects(
    assertTenantPinnedExternalRuntime({
      tenantLedger,
      identityTenantId: "tenant_external_unregistered",
      databaseTenantId: "tenant_external_unregistered",
      deploymentMode: "tenant-pinned",
      staffAuthAuthority: "internal-password",
    }),
    (error) => error?.safe_error_code === "EXTERNAL_TENANT_RUNTIME_BINDING_INVALID",
  );
  for (const binding of [
    { databaseTenantId: "tenant_external_other" },
    { deploymentMode: null },
    { staffOidcProvider: { federated_tenant_id: "33333333-3333-4333-8333-333333333333" } },
  ]) {
    await assert.rejects(
      assertTenantPinnedExternalRuntime({
        tenantLedger,
        identityTenantId: TENANT_ID,
        databaseTenantId: TENANT_ID,
        deploymentMode: "tenant-pinned",
        staffAuthAuthority: "entra-oidc",
        staffOidcProvider: { federated_tenant_id: ENTRA_TENANT_ID },
        ...binding,
      }),
      (error) => error?.safe_error_code === "EXTERNAL_TENANT_RUNTIME_BINDING_INVALID",
    );
  }

  const actions = (await identity.listSecurityAudit({ tenant_id: TENANT_ID })).map(({ action }) => action);
  assert.equal(actions.filter((action) => action === "auth.external_tenant.provisioning.started").length, 1);
  assert.equal(actions.filter((action) => action === "auth.external_tenant.provisioning.completed").length, 1);
  assert.equal(actions.filter((action) => action === "auth.directory.user.provisioned").length, 2);
  assert.equal(actions.filter((action) => action === "auth.external_tenant.federated_identity.provisioned").length, 1);

  const changedOperator = manifest();
  changedOperator.operator_ref = "approved-operator-002";
  await assert.rejects(
    provisionExternalTenant({
      ...options,
      manifest: changedOperator,
      expectedManifestSha256: externalTenantProvisioningManifestSha256(changedOperator),
    }),
    (error) => error?.safe_error_code === "EXTERNAL_TENANT_PROVISIONING_CONFLICT",
  );

  const changed = manifest();
  changed.members[1].scopes.push("matter.write");
  await assert.rejects(
    provisionExternalTenant({
      ...options,
      manifest: changed,
      expectedManifestSha256: externalTenantProvisioningManifestSha256(changed),
    }),
    (error) => error?.safe_error_code === "EXTERNAL_TENANT_PROVISIONING_CONFLICT",
  );

  const rawMaterial = "must-not-leave-postgres";
  await fixture.adminPool.query(
    `UPDATE lawos_identity.tenant_provisioning_requests
        SET receipt = $2::jsonb
      WHERE tenant_id = $1`,
    [TENANT_ID, JSON.stringify({ detail: rawMaterial })],
  );
  const rejectedReceipt = await provisionExternalTenant(options).catch((error) => error);
  assert.match(rejectedReceipt.message, /receipt contains unprotected text/u);
  assert.equal(rejectedReceipt.message.includes(rawMaterial), false);
});

test("internal-password external tenant members enter the existing reset flow without generated credentials", async (t) => {
  const fixture = await createMigratedPostgresFixture(t);
  if (!fixture) return;
  await runClientOperationsPostgresMigrations(fixture.adminPool);
  const input = internalPasswordManifest();
  const receipt = await provisionExternalTenant({
    manifest: input,
    expectedManifestSha256: externalTenantProvisioningManifestSha256(input),
    runtimeBinding: {
      deployment_mode: "tenant-pinned",
      identity_tenant_id: INTERNAL_TENANT_ID,
      database_tenant_id: INTERNAL_TENANT_ID,
      staff_auth_authority: "internal-password",
    },
    adminPool: fixture.adminPool,
    appPool: fixture.appPool,
    tenantContextSecret: fixture.tenantContextSecret,
    clock: () => new Date("2026-08-12T02:10:00.000Z"),
  });
  assert.equal(receipt.outcome, "completed");
  assert.equal(receipt.member_count, 1);
  assert.equal(receipt.prebound_federated_member_count, 0);
  assert.equal(receipt.reset_required_member_count, 1);
  assert.equal(receipt.authentication_material_returned, false);

  const identity = createPostgresIdentityLedger({ pool: fixture.appPool });
  const account = await identity.getAccount({
    tenant_id: INTERNAL_TENANT_ID,
    user_id: input.members[0].user_id,
  });
  assert.equal(account.account_status, "active");
  assert.equal(account.credential_provider, LAWOS_INTERNAL_PASSWORD_PROVIDER_ID);
  assert.equal(account.credential_status, "reset_required");
  assert.deepEqual(account.password_hash, {});
  assert.equal(account.federated_tenant_id, null);
  assert.equal(account.federated_subject_id, null);

  const tenantLedger = createPostgresTenantProvisioningLedger({ pool: fixture.appPool });
  assert.equal((await assertTenantPinnedExternalRuntime({
    tenantLedger,
    identityTenantId: INTERNAL_TENANT_ID,
    databaseTenantId: INTERNAL_TENANT_ID,
    deploymentMode: "tenant-pinned",
    staffAuthAuthority: "internal-password",
  })).active, true);
  await assert.rejects(
    assertTenantPinnedExternalRuntime({
      tenantLedger,
      identityTenantId: INTERNAL_TENANT_ID,
      databaseTenantId: INTERNAL_TENANT_ID,
      deploymentMode: "tenant-pinned",
      staffAuthAuthority: "internal-password",
      staffOidcProvider: { federated_tenant_id: ENTRA_TENANT_ID },
    }),
    (error) => error?.safe_error_code === "EXTERNAL_TENANT_RUNTIME_BINDING_INVALID",
  );

  let closed = false;
  const runtimePool = {
    query: fixture.appPool.query.bind(fixture.appPool),
    connect: fixture.appPool.connect.bind(fixture.appPool),
    end: async () => { closed = true; },
  };
  await assert.rejects(
    startApiServer({
      port: 0,
      runtimeProfile: "operational",
      sessionSecret: "external-tenant-startup-test-secret-material",
      stepUpAuthority: Object.freeze({}),
      staffAuthAuthority: "internal-password",
      persistenceAuthority: "postgres-v2",
      persistenceAuthorityEnv: {
        LAWOS_POSTGRES_URL_SECRET_ID: "lawos/test/external-tenant-postgres",
        LAWOS_POSTGRES_TENANT_CONTEXT_SECRET_ID: "lawos/test/external-tenant-context",
        LAWOS_IDENTITY_TENANT_ID: INTERNAL_TENANT_ID,
        LAWOS_DATABASE_TENANT_ID: TENANT_ID,
        LAWOS_TENANT_DEPLOYMENT_MODE: "tenant-pinned",
      },
      persistenceResolvePostgresSecret: async ({ secretId }) => secretId.endsWith("tenant-context")
        ? fixture.tenantContextSecret
        : fixture.instance.connection_string,
      persistenceConnectPostgres: async () => runtimePool,
    }),
    (error) => error?.safe_error_code === "EXTERNAL_TENANT_RUNTIME_BINDING_INVALID",
  );
  assert.equal(closed, true);
});

test("identity collision leaves no exact authority, tenant, request, audit or application visibility", async (t) => {
  const fixture = await createMigratedPostgresFixture(t);
  if (!fixture) return;
  await runClientOperationsPostgresMigrations(fixture.adminPool);
  await removeSyntheticWildcard(fixture);
  const input = internalPasswordManifest();
  await fixture.adminPool.query(
    "INSERT INTO lawos_identity.accounts (tenant_id, user_id, email) VALUES ($1, $2, $3)",
    [input.tenant.tenant_id, "preexisting_identity", "collision@example.test"],
  );

  await assert.rejects(
    provisionExternalTenant(internalProvisioningOptions(input, fixture)),
    (error) => error?.safe_error_code === "EXTERNAL_TENANT_PROVISIONING_CONFLICT" && error?.status === 409,
  );
  assert.deepEqual(await provisioningResidue(fixture.adminPool, input.tenant.tenant_id), {
    authorities: 0,
    tenants: 0,
    requests: 0,
    accounts: 1,
    memberships: 0,
    member_requests: 0,
    outbox_events: 0,
    audit_events: 0,
  });
  assert.equal((await fixture.adminPool.query(
    "SELECT count(*)::integer AS count FROM lawos_identity.accounts WHERE tenant_id = $1",
    [input.tenant.tenant_id],
  )).rows[0].count, 1);
  await assertNoApplicationVisibility(fixture.appPool, input.tenant.tenant_id);
});

test("tenant id collision preserves only the pre-existing tenant and grants no application visibility", async (t) => {
  const fixture = await createMigratedPostgresFixture(t);
  if (!fixture) return;
  await runClientOperationsPostgresMigrations(fixture.adminPool);
  await removeSyntheticWildcard(fixture);
  const input = internalPasswordManifest();
  await fixture.adminPool.query(
    `INSERT INTO lawos_identity.tenants
       (tenant_id, display_name, deployment_mode, staff_auth_authority, status)
     VALUES ($1, 'Pre-existing unrelated firm', 'tenant-pinned', 'internal-password', 'active')`,
    [input.tenant.tenant_id],
  );

  await assert.rejects(
    provisionExternalTenant(internalProvisioningOptions(input, fixture)),
    (error) => error?.safe_error_code === "EXTERNAL_TENANT_PROVISIONING_CONFLICT" && error?.status === 409,
  );
  assert.deepEqual(await provisioningResidue(fixture.adminPool, input.tenant.tenant_id), {
    authorities: 0,
    tenants: 1,
    requests: 0,
    accounts: 0,
    memberships: 0,
    member_requests: 0,
    outbox_events: 0,
    audit_events: 0,
  });
  assert.equal((await fixture.adminPool.query(
    "SELECT display_name FROM lawos_identity.tenants WHERE tenant_id = $1",
    [input.tenant.tenant_id],
  )).rows[0].display_name, "Pre-existing unrelated firm");
  await assertNoApplicationVisibility(fixture.appPool, input.tenant.tenant_id);
});

test("matching pre-existing tenant without exact request ownership is not adopted", async (t) => {
  const fixture = await createMigratedPostgresFixture(t);
  if (!fixture) return;
  await runClientOperationsPostgresMigrations(fixture.adminPool);
  await removeSyntheticWildcard(fixture);
  const input = internalPasswordManifest();
  await fixture.adminPool.query(
    `INSERT INTO lawos_identity.tenants
       (tenant_id, display_name, deployment_mode, staff_auth_authority, status)
     VALUES ($1, $2, 'tenant-pinned', 'internal-password', 'provisioning')`,
    [input.tenant.tenant_id, input.tenant.display_name],
  );

  await assert.rejects(
    provisionExternalTenant(internalProvisioningOptions(input, fixture)),
    (error) => error?.safe_error_code === "EXTERNAL_TENANT_PROVISIONING_CONFLICT" && error?.status === 409,
  );
  assert.deepEqual(await provisioningResidue(fixture.adminPool, input.tenant.tenant_id), {
    authorities: 0,
    tenants: 1,
    requests: 0,
    accounts: 0,
    memberships: 0,
    member_requests: 0,
    outbox_events: 0,
    audit_events: 0,
  });
  const preserved = (await fixture.adminPool.query(
    `SELECT display_name, status, member_count, state_version
       FROM lawos_identity.tenants WHERE tenant_id = $1`,
    [input.tenant.tenant_id],
  )).rows[0];
  assert.deepEqual(preserved, {
    display_name: input.tenant.display_name,
    status: "provisioning",
    member_count: 0,
    state_version: "1",
  });
  await assertNoApplicationVisibility(fixture.appPool, input.tenant.tenant_id);
});

test("duplicate Entra subject rolls back the complete provisioning request", async (t) => {
  const fixture = await createMigratedPostgresFixture(t);
  if (!fixture) return;
  await runClientOperationsPostgresMigrations(fixture.adminPool);
  await removeSyntheticWildcard(fixture);
  const input = manifest();
  input.members[1].federated_subject_id = input.members[0].federated_subject_id;

  await assert.rejects(
    provisionExternalTenant({
      manifest: input,
      expectedManifestSha256: externalTenantProvisioningManifestSha256(input),
      runtimeBinding: runtimeBinding(),
      adminPool: fixture.adminPool,
      appPool: fixture.appPool,
      tenantContextSecret: fixture.tenantContextSecret,
    }),
    (error) => error?.safe_error_code === "EXTERNAL_TENANT_PROVISIONING_CONFLICT" && error?.status === 409,
  );
  assert.deepEqual(await provisioningResidue(fixture.adminPool, input.tenant.tenant_id), {
    authorities: 0,
    tenants: 0,
    requests: 0,
    accounts: 0,
    memberships: 0,
    member_requests: 0,
    outbox_events: 0,
    audit_events: 0,
  });
  assert.equal((await fixture.adminPool.query(
    `SELECT count(*)::integer AS count
       FROM lawos_identity.accounts
      WHERE tenant_id = $1 AND federated_subject_id = $2`,
    [input.tenant.tenant_id, input.members[0].federated_subject_id],
  )).rows[0].count, 0);
  await assertNoApplicationVisibility(fixture.appPool, input.tenant.tenant_id);
});

test("admin and application database mismatch fails before creating tenant authority or ledger state", async (t) => {
  const adminFixture = await createMigratedPostgresFixture(t);
  if (!adminFixture) return;
  const appFixture = await createMigratedPostgresFixture(t);
  if (!appFixture) return;
  await Promise.all([
    runClientOperationsPostgresMigrations(adminFixture.adminPool),
    runClientOperationsPostgresMigrations(appFixture.adminPool),
  ]);
  await Promise.all([removeSyntheticWildcard(adminFixture), removeSyntheticWildcard(appFixture)]);
  const input = internalPasswordManifest();

  await assert.rejects(
    provisionExternalTenant(internalProvisioningOptions(input, adminFixture, {
      appPool: appFixture.appPool,
      tenantContextSecret: appFixture.tenantContextSecret,
    })),
    (error) => error?.safe_error_code === "EXTERNAL_TENANT_DATABASE_BINDING_INVALID" && error?.status === 500,
  );
  for (const fixture of [adminFixture, appFixture]) {
    assert.deepEqual(await provisioningResidue(fixture.adminPool, input.tenant.tenant_id), {
      authorities: 0,
      tenants: 0,
      requests: 0,
      accounts: 0,
      memberships: 0,
      member_requests: 0,
      outbox_events: 0,
      audit_events: 0,
    });
    await assertNoApplicationVisibility(fixture.appPool, input.tenant.tenant_id);
  }
});

test("application context secret mismatch fails before creating tenant authority or ledger state", async (t) => {
  const fixture = await createMigratedPostgresFixture(t);
  if (!fixture) return;
  await runClientOperationsPostgresMigrations(fixture.adminPool);
  await removeSyntheticWildcard(fixture);
  const input = internalPasswordManifest();

  await assert.rejects(
    provisionExternalTenant(internalProvisioningOptions(input, fixture, {
      tenantContextSecret: "different-external-tenant-context-secret-material",
    })),
    (error) => error?.safe_error_code === "EXTERNAL_TENANT_CONTEXT_SECRET_BINDING_INVALID" && error?.status === 500,
  );
  assert.deepEqual(await provisioningResidue(fixture.adminPool, input.tenant.tenant_id), {
    authorities: 0,
    tenants: 0,
    requests: 0,
    accounts: 0,
    memberships: 0,
    member_requests: 0,
    outbox_events: 0,
    audit_events: 0,
  });
  await assertNoApplicationVisibility(fixture.appPool, input.tenant.tenant_id);
});

test("application role reads only its tenant registry and cannot mutate own or cross-tenant provisioning state", async (t) => {
  const fixture = await createMigratedPostgresFixture(t);
  if (!fixture) return;
  const tenantA = "tenant_lawos_staging_a";
  const tenantB = "tenant_lawos_staging_b";
  await fixture.adminPool.query(
    `INSERT INTO lawos_identity.tenants
       (tenant_id, display_name, deployment_mode, staff_auth_authority, status)
     VALUES ($1, 'RLS tenant A', 'tenant-pinned', 'internal-password', 'active'),
            ($2, 'RLS tenant B', 'tenant-pinned', 'internal-password', 'active')`,
    [tenantA, tenantB],
  );
  await fixture.adminPool.query(
    `INSERT INTO lawos_identity.tenant_provisioning_requests
       (tenant_id, idempotency_key_hash, request_hash, operator_ref_hash, requested_member_count)
     VALUES ($1, $3, $4, $5, 1),
            ($2, $6, $7, $8, 1)`,
    [
      tenantA,
      tenantB,
      "1".repeat(64),
      "2".repeat(64),
      "3".repeat(64),
      "4".repeat(64),
      "5".repeat(64),
      "6".repeat(64),
    ],
  );

  const visible = await withPostgresTransaction(fixture.appPool, { tenant_id: tenantA }, async (client) => ({
    ownTenants: await client.query("SELECT count(*)::integer AS count FROM lawos_identity.tenants WHERE tenant_id = $1", [tenantA]),
    ownRequests: await client.query("SELECT count(*)::integer AS count FROM lawos_identity.tenant_provisioning_requests WHERE tenant_id = $1", [tenantA]),
    crossTenants: await client.query("SELECT count(*)::integer AS count FROM lawos_identity.tenants WHERE tenant_id = $1", [tenantB]),
    crossRequests: await client.query("SELECT count(*)::integer AS count FROM lawos_identity.tenant_provisioning_requests WHERE tenant_id = $1", [tenantB]),
  }));
  assert.equal(visible.ownTenants.rows[0].count, 1);
  assert.equal(visible.ownRequests.rows[0].count, 1);
  assert.equal(visible.crossTenants.rows[0].count, 0);
  assert.equal(visible.crossRequests.rows[0].count, 0);

  const deniedStatements = [
    ["tenant_lawos_staging_c", `INSERT INTO lawos_identity.tenants (tenant_id, display_name, deployment_mode, staff_auth_authority) VALUES ('tenant_lawos_staging_c', 'C', 'tenant-pinned', 'internal-password')`],
    [tenantA, `UPDATE lawos_identity.tenants SET status = 'disabled' WHERE tenant_id = '${tenantA}'`],
    [tenantA, `DELETE FROM lawos_identity.tenants WHERE tenant_id = '${tenantA}'`],
    [tenantA, `INSERT INTO lawos_identity.tenant_provisioning_requests (tenant_id, idempotency_key_hash, request_hash, operator_ref_hash, requested_member_count) VALUES ('${tenantA}', '${"7".repeat(64)}', '${"8".repeat(64)}', '${"9".repeat(64)}', 1)`],
    [tenantA, `UPDATE lawos_identity.tenant_provisioning_requests SET status = 'completed', receipt = '{}'::jsonb, completed_at = clock_timestamp() WHERE tenant_id = '${tenantA}'`],
    [tenantA, `DELETE FROM lawos_identity.tenant_provisioning_requests WHERE tenant_id = '${tenantA}'`],
    [tenantA, `INSERT INTO lawos_identity.tenants (tenant_id, display_name, deployment_mode, staff_auth_authority) VALUES ('tenant_lawos_staging_d', 'D', 'tenant-pinned', 'internal-password')`],
    [tenantA, `UPDATE lawos_identity.tenants SET status = 'disabled' WHERE tenant_id = '${tenantB}'`],
    [tenantA, `DELETE FROM lawos_identity.tenants WHERE tenant_id = '${tenantB}'`],
    [tenantA, `INSERT INTO lawos_identity.tenant_provisioning_requests (tenant_id, idempotency_key_hash, request_hash, operator_ref_hash, requested_member_count) VALUES ('${tenantB}', '${"a".repeat(64)}', '${"b".repeat(64)}', '${"c".repeat(64)}', 1)`],
    [tenantA, `UPDATE lawos_identity.tenant_provisioning_requests SET status = 'completed', receipt = '{}'::jsonb, completed_at = clock_timestamp() WHERE tenant_id = '${tenantB}'`],
    [tenantA, `DELETE FROM lawos_identity.tenant_provisioning_requests WHERE tenant_id = '${tenantB}'`],
  ];
  for (const [tenantId, statement] of deniedStatements) {
    await assert.rejects(
      withPostgresTransaction(fixture.appPool, { tenant_id: tenantId }, (client) => client.query(statement)),
      (error) => error?.code === "LAWOS_POSTGRES_ACCESS_DENIED" && error?.status === 403,
      statement,
    );
  }

  const unchanged = await fixture.adminPool.query(
    `SELECT
       (SELECT count(*)::integer FROM lawos_identity.tenants WHERE status = 'disabled') AS disabled_tenants,
       (SELECT count(*)::integer FROM lawos_identity.tenant_provisioning_requests WHERE status = 'completed' OR receipt IS NOT NULL) AS completed_requests`,
  );
  assert.deepEqual(unchanged.rows[0], { disabled_tenants: 0, completed_requests: 0 });
});

test("external tenant provisioning requires admin writes and a read-only application registry role", async (t) => {
  const fixture = await createMigratedPostgresFixture(t);
  if (!fixture) return;
  await runClientOperationsPostgresMigrations(fixture.adminPool);
  const input = internalPasswordManifest();
  const options = {
    manifest: input,
    expectedManifestSha256: externalTenantProvisioningManifestSha256(input),
    runtimeBinding: {
      deployment_mode: "tenant-pinned",
      identity_tenant_id: INTERNAL_TENANT_ID,
      database_tenant_id: INTERNAL_TENANT_ID,
      staff_auth_authority: "internal-password",
    },
    adminPool: fixture.adminPool,
    appPool: fixture.appPool,
    tenantContextSecret: fixture.tenantContextSecret,
  };
  for (const table of ["tenants", "tenant_provisioning_requests"]) {
    await fixture.adminPool.query(`REVOKE SELECT ON lawos_identity.${table} FROM lawos_app`);
    await assert.rejects(
      provisionExternalTenant(options),
      (error) => error?.safe_error_code === "EXTERNAL_TENANT_APP_DATABASE_ROLE_INVALID",
      `${table} SELECT must be required independently`,
    );
    await fixture.adminPool.query(`GRANT SELECT ON lawos_identity.${table} TO lawos_app`);
  }
  for (const table of ["tenants", "tenant_provisioning_requests"]) {
    for (const privilege of ["INSERT", "UPDATE", "DELETE", "TRUNCATE", "REFERENCES", "TRIGGER"]) {
      await fixture.adminPool.query(`GRANT ${privilege} ON lawos_identity.${table} TO lawos_app`);
      await assert.rejects(
        provisionExternalTenant(options),
        (error) => error?.safe_error_code === "EXTERNAL_TENANT_APP_DATABASE_ROLE_INVALID",
        `${table} ${privilege} must be rejected independently`,
      );
      await fixture.adminPool.query(`REVOKE ${privilege} ON lawos_identity.${table} FROM lawos_app`);
    }
  }
  for (const missing of [
    "tenant_authority_select",
    "tenant_authority_insert",
    "tenant_authority_update",
    "tenant_authority_delete",
    "tenant_registry_select",
    "tenant_registry_insert",
    "tenant_registry_update",
    "provisioning_select",
    "provisioning_insert",
    "provisioning_update",
  ]) {
    const adminPool = {
      connect: fixture.adminPool.connect.bind(fixture.adminPool),
      async query(statement, parameters) {
        if (String(statement).includes("current_user AS role_name")) {
          return {
            rows: [{
              role_name: "external_tenant_operator",
              tenant_authority_select: missing !== "tenant_authority_select",
              tenant_authority_insert: missing !== "tenant_authority_insert",
              tenant_authority_update: missing !== "tenant_authority_update",
              tenant_authority_delete: missing !== "tenant_authority_delete",
              tenant_registry_select: missing !== "tenant_registry_select",
              tenant_registry_insert: missing !== "tenant_registry_insert",
              tenant_registry_update: missing !== "tenant_registry_update",
              provisioning_select: missing !== "provisioning_select",
              provisioning_insert: missing !== "provisioning_insert",
              provisioning_update: missing !== "provisioning_update",
            }],
          };
        }
        return fixture.adminPool.query(statement, parameters);
      },
    };
    await assert.rejects(
      provisionExternalTenant({ ...options, adminPool }),
      (error) => error?.safe_error_code === "EXTERNAL_TENANT_ADMIN_DATABASE_ROLE_REQUIRED",
      `${missing} must be required independently`,
    );
  }
  assert.equal((await fixture.adminPool.query(
    "SELECT count(*)::integer AS count FROM lawos_identity.tenants WHERE tenant_id = $1",
    [INTERNAL_TENANT_ID],
  )).rows[0].count, 0);
});

test("external tenant manifest rejects cross-tenant, credential and non-string scalar input before database access", async () => {
  const crossTenant = manifest();
  crossTenant.tenant.deployment.database_tenant_id = "tenant_external_other";
  assert.throws(
    () => normalizeExternalTenantProvisioningManifest(crossTenant),
    (error) => error?.safe_error_code === "EXTERNAL_TENANT_CROSS_TENANT_DENIED",
  );
  const credential = manifest();
  credential.members[0].password = "must-never-be-accepted";
  assert.throws(
    () => normalizeExternalTenantProvisioningManifest(credential),
    (error) => error?.safe_error_code === "EXTERNAL_TENANT_MANIFEST_INVALID",
  );
  for (const mutate of [
    (value) => { value.operator_ref = 42; },
    (value) => { value.tenant.display_name = { toString: () => "coerced firm" }; },
    (value) => { value.members[0].role_ids = [7]; },
    (value) => { value.members[0].federated_subject_id = new String(ADMIN_SUBJECT_ID); },
  ]) {
    const invalid = manifest();
    mutate(invalid);
    assert.throws(
      () => normalizeExternalTenantProvisioningManifest(invalid),
      (error) => error?.safe_error_code === "EXTERNAL_TENANT_MANIFEST_INVALID",
    );
  }
  const valid = manifest();
  await assert.rejects(
    provisionExternalTenant({
      manifest: valid,
      expectedManifestSha256: new String(externalTenantProvisioningManifestSha256(valid)),
      runtimeBinding: runtimeBinding(),
      adminPool: { connect() { throw new Error("must not connect"); }, query() { throw new Error("must not query"); } },
      appPool: { connect() { throw new Error("must not connect"); }, query() { throw new Error("must not query"); } },
      tenantContextSecret: "unused-test-context-secret-material",
    }),
    (error) => error?.safe_error_code === "EXTERNAL_TENANT_MANIFEST_HASH_MISMATCH",
  );
});
