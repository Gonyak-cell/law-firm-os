import assert from "node:assert/strict";
import test from "node:test";
import { createLocalStorageAdapter } from "../../../packages/dms/src/storage/local-storage-adapter.js";
import { createMigratedPostgresFixture } from "../../../packages/persistence/test/helpers/disposable-postgres.js";
import { createPostgresIdentityLedger } from "../../../packages/runtime-auth/src/postgres-identity-ledger.js";
import { buildPrivateStagingSyntheticSources } from "../../../scripts/lib/private-staging-artifact.mjs";
import {
  createPrivateStagingHttpTransport,
  runPrivateStagingCut007,
} from "../../../scripts/lib/private-staging-cut007.mjs";
import { startApiServer } from "../src/server.js";
import { createApiSessionAuth } from "../src/session-auth.js";
import { runPrivateStagingCut007Readback } from "../src/private-staging-cut007-readback.js";
import { runPrivateStagingSyntheticBaseline } from "../src/private-staging-synthetic-baseline.js";

const TENANTS = ["tenant_lawos_staging_cut007_a", "tenant_lawos_staging_cut007_b"];
const ACCOUNT_INPUTS = [
  {
    user_id: "synthetic-lawos-staging-admin",
    employee_id: "emp-lawos-staging-admin",
    email: "lawos-staging-admin@example.test",
    display_name: "LawOS Staging Pilot ADMIN",
    role_ids: ["firm_admin", "matter_vault_admin"],
  },
  {
    user_id: "synthetic-lawos-staging-attorney",
    employee_id: "emp-lawos-staging-attorney",
    email: "lawos-staging-attorney@example.test",
    display_name: "LawOS Staging Pilot ATTORNEY",
    role_ids: ["attorney", "matter_vault_user"],
  },
  {
    user_id: "synthetic-lawos-staging-disabled",
    employee_id: "emp-lawos-staging-disabled",
    email: "lawos-staging-disabled@example.test",
    display_name: "LawOS Staging Pilot DISABLED",
    role_ids: ["attorney", "matter_vault_user"],
    account_status: "disabled",
  },
];

function syntheticSources() {
  return buildPrivateStagingSyntheticSources({
    schema_version: "law-firm-os.private-staging.synthetic-account-directory.v1",
    data_scope: "synthetic-only",
    real_identity_count: 0,
    accounts_approved: true,
    tenant_id: TENANTS[0],
    accounts: ACCOUNT_INPUTS,
  });
}

test("CUT-007 runs the full synthetic internal-auth, HRX, client/matter, DMS, finance, portal, restart, and PostgreSQL readback path", async (t) => {
  const fixture = await createMigratedPostgresFixture(t);
  if (!fixture) return;
  const sources = syntheticSources();
  await runPrivateStagingSyntheticBaseline({
    pool: fixture.appPool,
    tenantIds: TENANTS,
    accountSeed: sources.account_seed,
    roster: sources.roster,
  });

  const delivered = new Map();
  const storage = createLocalStorageAdapter({ adapter_id: "cut007-disposable-postgres" });
  const identityRepository = createPostgresIdentityLedger({ pool: fixture.appPool });
  const provisionedAdmin = await identityRepository.findDirectoryUserByEmail({ tenant_id: TENANTS[0], email: ACCOUNT_INPUTS[0].email });
  assert.ok(provisionedAdmin.scopes.includes("hrx.employee.read"));
  assert.ok(provisionedAdmin.hrx_scopes.includes("hrx.employee.read"));
  const sessionSecret = "cut007-disposable-session-secret-with-adequate-length";
  let started = null;
  let baseUrl = null;
  let activeSessionAuth = null;

  const passwordResetEmailDelivery = async ({ to, token }) => {
    const queue = delivered.get(to) ?? [];
    queue.push(token);
    delivered.set(to, queue);
    return { mode: "email", provider: "cut007-disposable-mailbox", status: "sent", message_id: `message-${queue.length}` };
  };

  function sessionAuth() {
    return createApiSessionAuth({
      profile: "operational",
      secret: sessionSecret,
      trustedTenantId: TENANTS[0],
      identityRepository,
      passwordResetEmailDelivery,
      passwordResetTtlMs: 30,
      loginLockMs: 60_000,
      maxFailedLogins: 5,
    });
  }

  async function start() {
    const pool = {
      query: fixture.appPool.query.bind(fixture.appPool),
      connect: fixture.appPool.connect.bind(fixture.appPool),
      end: async () => {},
    };
    activeSessionAuth = sessionAuth();
    started = await startApiServer({
      port: 0,
      runtimeProfile: "operational",
      staffAuthAuthority: "internal-password",
      sessionSecret,
      sessionAuth: activeSessionAuth,
      stepUpAuthority: Object.freeze({}),
      persistenceAuthority: "postgres-v2",
      persistenceAuthorityEnv: {
        LAWOS_POSTGRES_URL_SECRET_ID: "lawos/test/cut007-postgres",
        LAWOS_POSTGRES_TENANT_CONTEXT_SECRET_ID: "lawos/test/cut007-tenant-context",
        LAWOS_PAYROLL_ARTIFACT_KEY_SECRET_ID: "lawos/test/cut007-payroll-key",
        LAWOS_DATA_SCOPE: "synthetic-only",
        AWS_REGION: "ap-northeast-2",
      },
      persistenceResolvePostgresSecret: async ({ secretId }) => secretId.endsWith("tenant-context")
        ? fixture.tenantContextSecret
        : fixture.instance.connection_string,
      persistenceConnectPostgres: async () => pool,
      dmsStorage: storage,
      payrollResolveArtifactSecret: async () => "cut007-disposable-payroll-artifact-secret",
    });
    baseUrl = `http://${started.host}:${started.port}`;
  }

  async function stop() {
    if (!started) return;
    await new Promise((resolve) => started.server.close(resolve));
    started = null;
  }

  await start();
  t.after(stop);
  const transport = async (request) => createPrivateStagingHttpTransport({ baseUrl })(request);
  const result = await runPrivateStagingCut007({
    transport,
    accounts: ACCOUNT_INPUTS,
    tenantIds: TENANTS,
    runId: "cut007-disposable-full-flow",
    resetExpiryWaitMs: 45,
    wait: (milliseconds) => new Promise((resolve) => setTimeout(resolve, milliseconds)),
    passwordFactory: (purpose) => `C7!Synthetic-${purpose}-Password-2026`,
    mailboxTokenProvider: async ({ email }) => {
      await activeSessionAuth.processPasswordResetQueue();
      const queue = delivered.get(email) ?? [];
      assert.ok(queue.length > 0, `missing synthetic mailbox message for ${email}`);
      return queue.shift();
    },
    coldRestart: async () => {
      await stop();
      await start();
      return { outcome: "PASS", cold_start_observed: true };
    },
    readback: ({ execution_id, expected }) => runPrivateStagingCut007Readback({
      pool: fixture.appPool,
      tenantIds: TENANTS,
      runId: execution_id,
      expected,
    }),
    browserSmoke: async () => ({
      outcome: "PASS",
      critical_flow_count: 5,
      screenshot_count: 3,
      console_error_count: 0,
      failed_request_count: 0,
      evidence_fingerprint: "b".repeat(64),
    }),
  });

  assert.equal(result.outcome, "PASS");
  assert.equal(result.data_scope, "synthetic-only");
  assert.equal(result.safe_counts.account_count, 3);
  assert.equal(result.safe_counts.document_count, 2);
  assert.ok(result.safe_counts.api_call_count > 50);
  assert.ok(result.safe_counts.idempotency_replay_count >= 5);
  assert.equal(result.wrong_tenant_visible_count, 0);
  assert.equal(result.json_fallback_count, 0);
  assert.equal(result.json_writer_count, 0);
  assert.equal(result.dual_write_count, 0);
  assert.equal(result.file_current_authority_count, 0);
  assert.equal(result.offline_mutation_count, 0);
  assert.equal(result.memory_fallback_count, 0);
  assert.equal(result.secret_material_returned, false);
  const serialized = JSON.stringify(result);
  assert.doesNotMatch(serialized, /@example\.test/u);
  assert.doesNotMatch(serialized, /Synthetic-.*-Password/u);
  assert.doesNotMatch(serialized, /lawos_session_v1/u);
});
