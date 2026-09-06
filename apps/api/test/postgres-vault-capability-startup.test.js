import assert from "node:assert/strict";
import test from "node:test";
import { createLocalStorageAdapter } from "../../../packages/dms/src/storage/local-storage-adapter.js";
import { createPostgresIdentityLedger } from "../../../packages/runtime-auth/src/postgres-identity-ledger.js";
import { LAWOS_INTERNAL_PASSWORD_PROVIDER_ID, createScryptPasswordHash } from "../src/auth-credential-store.js";
import { startApiServer } from "../src/server.js";
import { createOutlookAuthorityPostgresFixture, runHistoricalHrxPostgresMigrations,
  runOutlookAuthorityPostgresMigrations } from "./support/outlook-authority-postgres-fixture.js";

const TENANT = "tenant-vault-capability-startup";
const USER = { user_id: "user-vault-capability-startup", email: "vault-capability@example.test",
  display_name: "Synthetic Vault reader", status: "active" };
const PASSWORD = "synthetic-vault-capability-password";
const MEMBERSHIP = { status: "active", role_ids: ["lawos_staff"], group_ids: [],
  scopes: ["vault.read", "audit.read"], hrx_scopes: [], source_ref: "synthetic-vault-capability-startup" };

test("operational startup publishes native Vault reads without an external provider and honors explicit resolver overrides", { timeout: 90_000 }, async (t) => {
  const fixture = await createOutlookAuthorityPostgresFixture(t, { appPoolMax: 1 });
  if (!fixture) return;
  await runHistoricalHrxPostgresMigrations(fixture.adminPool);
  await runOutlookAuthorityPostgresMigrations(fixture);
  const identity = createPostgresIdentityLedger({ pool: fixture.appPool });
  const provision = (membership) => identity.provisionDirectoryUser({ tenant_id: TENANT, user: USER,
    membership, actor_id: "synthetic-capability-provisioner" });
  await provision(MEMBERSHIP);
  await identity.setCredential({ tenant_id: TENANT, user: USER,
    provider_id: LAWOS_INTERNAL_PASSWORD_PROVIDER_ID,
    password_hash: createScryptPasswordHash(PASSWORD), status: "active" });
  const pool = { query: fixture.appPool.query.bind(fixture.appPool),
    connect: fixture.appPool.connect.bind(fixture.appPool), end: async () => {} };
  const providerCalls = [];
  const providerResolver = async (input) => {
    providerCalls.push(input);
    return { authoritative: true, provider_state: "ready", authority_ref: "synthetic-external-vault",
      tenant_binding_state: "bound", user_binding_state: "bound", capabilities: { download: true } };
  };
  for (const [label, extra, allowed] of [
    ["native", {}, ["read", "download", "audit"]],
    ["disabled", { vaultCapabilityResolver: null }, []],
    ["external", { vaultUploadProvider: { resolveCapabilities: providerResolver } }, ["download"]],
  ]) {
    const started = await startApiServer({
      port: 0, runtimeProfile: "operational", staffAuthAuthority: "internal-password",
      sessionSecret: "synthetic-vault-capability-session-secret-32-bytes", stepUpAuthority: {},
      persistenceAuthority: "postgres-v2", outlookDesktopEntitlementEnabled: false,
      persistenceAuthorityEnv: { LAWOS_POSTGRES_URL_SECRET_ID: "lawos/test/vault-capability",
        LAWOS_POSTGRES_TENANT_CONTEXT_SECRET_ID: "lawos/test/vault-capability-tenant-context",
        LAWOS_PAYROLL_ARTIFACT_KEY_SECRET_ID: "lawos/test/vault-capability-payroll",
        LAWOS_IDENTITY_TENANT_ID: TENANT, LAWOS_DATA_SCOPE: "synthetic-only", AWS_REGION: "ap-northeast-2" },
      persistenceResolvePostgresSecret: async ({ secretId }) => secretId.endsWith("tenant-context")
        ? fixture.tenantContextSecret : fixture.instance.connection_string,
      persistenceConnectPostgres: async () => pool,
      dmsStorage: createLocalStorageAdapter({ adapter_id: "synthetic-capability-storage" }),
      payrollResolveArtifactSecret: async () => "synthetic-vault-capability-payroll-secret",
      ...extra,
    });
    try {
      const base = `http://${started.host}:${started.port}`;
      const loginResponse = await fetch(`${base}/api/auth/login`, { method: "POST",
        headers: { "content-type": "application/json" }, body: JSON.stringify({ email: USER.email, password: PASSWORD }) });
      const login = await loginResponse.json();
      assert.equal(loginResponse.status, 200, JSON.stringify(login));
      const headers = { authorization: `Bearer ${login.session_token}` };
      const sessionResponse = await fetch(`${base}/api/auth/session`, { headers });
      const session = await sessionResponse.json();
      assert.equal(sessionResponse.status, 200, JSON.stringify(session));
      assert.deepEqual(session.vault_capabilities.capabilities.filter((item) => item.allowed).map((item) => item.id), allowed, label);
      assert.equal(session.vault_capabilities.token_material_returned, false);
      assert.equal(session.vault_capabilities.raw_policy_returned, false);
      assert.equal((await fetch(`${base}/api/auth/session`)).status, 401);
      await provision({ ...MEMBERSHIP, status: "disabled" });
      const revoked = await fetch(`${base}/api/auth/session`, { headers });
      assert.equal(revoked.status, 401);
      assert.equal(Object.hasOwn(await revoked.json(), "vault_capabilities"), false);
      await provision(MEMBERSHIP);
    } finally {
      await new Promise((resolve) => { started.server.close(resolve); started.server.closeAllConnections(); });
    }
  }
  assert.equal(providerCalls.length, 1, "only the explicit external resolver receives a verified identity");
  assert.deepEqual(Object.keys(providerCalls[0]).sort(), ["request_id", "tenant_id", "user_id"]);
  assert.equal(providerCalls[0].tenant_id, TENANT);
  assert.equal(providerCalls[0].user_id, USER.user_id);
  const records = await fixture.adminPool.query("SELECT count(*)::int AS count FROM lawos_domain.records");
  assert.equal(records.rows[0].count, 0, "capability requests must not materialize or seed domain data");
});
