import assert from "node:assert/strict";
import test from "node:test";
import { createLocalStorageAdapter } from "../../../packages/dms/src/storage/local-storage-adapter.js";
import { CRM_DOMAIN_DESCRIPTOR } from "../../../packages/crm/src/central-ledger.js";
import { transitionOpportunityStage } from "../../../packages/crm/src/opportunity-service.js";
import { createCrmRuntimeRepository } from "../../../packages/crm/src/runtime-repository.js";
import { runRecordRepositoryDomainCommand } from "../../../packages/persistence/src/record-domain-adapter.js";
import { createPostgresDomainLedger } from "../../../packages/persistence/src/postgres/domain-ledger.js";
import { createMigratedPostgresFixture } from "../../../packages/persistence/test/helpers/disposable-postgres.js";
import { createPostgresIdentityLedger } from "../../../packages/runtime-auth/src/postgres-identity-ledger.js";
import { buildPrivateStagingSyntheticSources } from "../../../scripts/lib/private-staging-artifact.mjs";
import {
  createPrivateStagingHttpTransport,
  runPrivateStagingCut007,
  runPrivateStagingCut007BrowserResume,
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
    email: "jwsuh+lawos-staging-admin@amic.kr",
    display_name: "LawOS Staging Pilot ADMIN",
    role_ids: ["firm_admin", "matter_vault_admin"],
  },
  {
    user_id: "synthetic-lawos-staging-attorney",
    employee_id: "emp-lawos-staging-attorney",
    email: "jwsuh+lawos-staging-attorney@amic.kr",
    display_name: "LawOS Staging Pilot ATTORNEY",
    role_ids: ["attorney", "matter_vault_user"],
  },
  {
    user_id: "synthetic-lawos-staging-disabled",
    employee_id: "emp-lawos-staging-disabled",
    email: "jwsuh+lawos-staging-disabled@amic.kr",
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

test("CUT-007 HTTP transport paces bounded retries after the cost-envelope throttle activates", async () => {
  const statuses = [429, 200, 200, 200];
  const waits = [];
  const transport = createPrivateStagingHttpTransport({
    baseUrl: "https://private-staging.example.invalid",
    fetchImpl: async () => ({
      status: statuses.shift(),
      json: async () => ({}),
    }),
    wait: async (milliseconds) => waits.push(milliseconds),
    throttleRetryWaitMs: 1,
    browserBurstRecoveryWaitMs: 5,
  });

  assert.deepEqual(await transport({ path: "/api/health" }), {
    status: 200,
    body: {},
    request_attempt_count: 2,
    throttle_retry_count: 1,
    capacity_retry_count: 0,
  });
  assert.deepEqual(await transport({ path: "/api/health" }), {
    status: 200,
    body: {},
    request_attempt_count: 1,
    throttle_retry_count: 0,
    capacity_retry_count: 0,
  });
  assert.deepEqual(await transport.recoverBurstCapacity(), { waited: true, wait_ms: 5 });
  assert.deepEqual(await transport({ path: "/api/health" }), {
    status: 200,
    body: {},
    request_attempt_count: 1,
    throttle_retry_count: 0,
    capacity_retry_count: 0,
  });
  assert.deepEqual(waits, [1, 1, 5]);
});

test("CUT-007 HTTP transport returns a persistent throttle after the bounded retry limit", async () => {
  let requestCount = 0;
  const transport = createPrivateStagingHttpTransport({
    baseUrl: "https://private-staging.example.invalid",
    fetchImpl: async () => {
      requestCount += 1;
      return { status: 429, json: async () => ({}) };
    },
    wait: async () => {},
    throttleRetryWaitMs: 0,
    throttleRetryLimit: 2,
  });

  assert.deepEqual(await transport({ path: "/api/health" }), {
    status: 429,
    body: {},
    request_attempt_count: 3,
    throttle_retry_count: 2,
    capacity_retry_count: 0,
  });
  assert.equal(requestCount, 3);
});

test("CUT-007 HTTP transport retries gateway capacity 503 but preserves application 503", async () => {
  const responses = [
    { status: 503, body: { message: "Service Unavailable" } },
    { status: 200, body: {} },
    { status: 503, body: { outcome: "blocked", safe_error_codes: ["API_DEPENDENCY_UNAVAILABLE"] } },
  ];
  const waits = [];
  const transport = createPrivateStagingHttpTransport({
    baseUrl: "https://private-staging.example.invalid",
    fetchImpl: async () => {
      const response = responses.shift();
      return { status: response.status, json: async () => response.body };
    },
    wait: async (milliseconds) => waits.push(milliseconds),
    throttleRetryWaitMs: 1,
  });

  assert.deepEqual(await transport({ path: "/master-data/client-groups/client-1" }), {
    status: 200,
    body: {},
    request_attempt_count: 2,
    throttle_retry_count: 0,
    capacity_retry_count: 1,
  });
  assert.deepEqual(await transport({ path: "/api/health" }), {
    status: 503,
    body: { outcome: "blocked", safe_error_codes: ["API_DEPENDENCY_UNAVAILABLE"] },
    request_attempt_count: 1,
    throttle_retry_count: 0,
    capacity_retry_count: 0,
  });
  responses.push({ status: 503, body: { message: "Service Unavailable" } });
  assert.deepEqual(await transport({ method: "POST", path: "/api/auth/login", body: {} }), {
    status: 503,
    body: { message: "Service Unavailable" },
    request_attempt_count: 1,
    throttle_retry_count: 0,
    capacity_retry_count: 0,
  });
  responses.push({ status: 429, body: { outcome: "blocked", safe_error_code: "APPLICATION_RATE_LIMITED" } });
  assert.deepEqual(await transport({ method: "POST", path: "/api/auth/login", body: {} }), {
    status: 429,
    body: { outcome: "blocked", safe_error_code: "APPLICATION_RATE_LIMITED" },
    request_attempt_count: 1,
    throttle_retry_count: 0,
    capacity_retry_count: 0,
  });
  assert.deepEqual(waits, [1]);
});

test("CUT-007 browser resume revalidates PostgreSQL and runs only reset plus browser checks", async () => {
  const calls = [];
  const expected = {
    user_ids: ACCOUNT_INPUTS.map((account) => account.user_id),
    employee_ids: ACCOUNT_INPUTS.map((account) => account.employee_id),
    matter_id: "matter-cut007-resume",
    document_ids: ["document-cut007-resume-a", "document-cut007-resume-b"],
    finance_record_id: "time-cut007-resume",
    portal_record_id: "dashboard-cut007-resume",
  };
  const result = await runPrivateStagingCut007BrowserResume({
    transport: async (request) => {
      calls.push(`${request.method ?? "GET"} ${request.path}`);
      if (request.path === "/api/health") {
        return {
          status: 200,
          body: {
            persistence_authority: "postgres-v2",
            bounded_contexts: [{
              postgres_authority_active: true,
              json_fallback: false,
              dual_write: false,
            }],
            persistence_authority_capabilities: {
              authority: "postgres-v2",
              json_fallback: false,
              dual_write: false,
              offline_mutation: false,
            },
            auth_authority: { staff_auth_authority: "internal-password" },
            runtime_safety_policy: { offline_capability: "rejected" },
          },
          request_attempt_count: 1,
        };
      }
      if (request.path === "/api/auth/password-reset/request") {
        return {
          status: 200,
          body: {
            outcome: "accepted",
            email_delivery: {
              status: "accepted",
              token_material_returned: false,
              reset_url_returned: false,
            },
          },
          request_attempt_count: 1,
        };
      }
      return {
        status: 200,
        body: { activated: true, token_material_returned: false },
        request_attempt_count: 1,
      };
    },
    accounts: ACCOUNT_INPUTS,
    tenantIds: TENANTS,
    expected,
    priorReadbackFingerprint: "a".repeat(64),
    runId: "cut007-browser-resume-test",
    mailboxTokenProvider: async ({ purpose }) => {
      assert.equal(purpose, "admin-browser-resume");
      return "synthetic-browser-resume-token";
    },
    passwordFactory: () => "C7!Synthetic-Browser-Resume-Password-2026",
    readback: async ({ expected: observed }) => {
      assert.deepEqual(observed, {
        ...expected,
        user_ids: [...expected.user_ids].sort(),
        employee_ids: [...expected.employee_ids].sort(),
        document_ids: [...expected.document_ids].sort(),
      });
      return {
        outcome: "PASS",
        safe_counts: { wrong_tenant_visible_count: 0 },
        readback_fingerprint: "b".repeat(64),
        json_fallback_count: 0,
        json_writer_count: 0,
        dual_write_count: 0,
        real_data_count: 0,
        raw_value_returned: false,
        secret_material_returned: false,
      };
    },
    browserSmoke: async () => ({
      outcome: "PASS",
      critical_flow_count: 7,
      screenshot_count: 5,
      api_request_count: 80,
      console_error_count: 0,
      failed_request_count: 0,
      evidence_fingerprint: "c".repeat(64),
    }),
  });

  assert.deepEqual(calls, [
    "GET /api/health",
    "POST /api/auth/password-reset/request",
    "POST /api/auth/password-reset/confirm",
  ]);
  assert.equal(result.outcome, "PASS");
  assert.equal(result.safe_counts.checkpoint_reused_count, 1);
  assert.equal(result.safe_counts.current_postgres_readback_count, 1);
  assert.equal(result.prior_readback_fingerprint, "a".repeat(64));
  assert.equal(result.readback_fingerprint, "b".repeat(64));
  assert.doesNotMatch(JSON.stringify(result), /Password|token|@amic\.kr/u);
});

test("PostgreSQL session auth and the deployed reset worker share the configured tenant", async (t) => {
  const fixture = await createMigratedPostgresFixture(t);
  if (!fixture) return;
  const pool = {
    query: fixture.appPool.query.bind(fixture.appPool),
    connect: fixture.appPool.connect.bind(fixture.appPool),
    end: async () => {},
  };
  const started = await startApiServer({
    port: 0,
    runtimeProfile: "operational",
    staffAuthAuthority: "internal-password",
    sessionSecret: "cut007-tenant-binding-session-secret-with-adequate-length",
    passwordResetEmailDelivery: async () => {
      throw new Error("an unknown synthetic address must not be delivered");
    },
    stepUpAuthority: Object.freeze({}),
    persistenceAuthority: "postgres-v2",
    persistenceAuthorityEnv: {
      LAWOS_POSTGRES_URL_SECRET_ID: "lawos/test/cut007-postgres",
      LAWOS_POSTGRES_TENANT_CONTEXT_SECRET_ID: "lawos/test/cut007-tenant-context",
      LAWOS_PAYROLL_ARTIFACT_KEY_SECRET_ID: "lawos/test/cut007-payroll-key",
      LAWOS_IDENTITY_TENANT_ID: TENANTS[0],
      LAWOS_DATA_SCOPE: "synthetic-only",
      AWS_REGION: "ap-northeast-2",
    },
    persistenceResolvePostgresSecret: async ({ secretId }) => secretId.endsWith("tenant-context")
      ? fixture.tenantContextSecret
      : fixture.instance.connection_string,
    persistenceConnectPostgres: async () => pool,
    dmsStorage: createLocalStorageAdapter({ adapter_id: "cut007-tenant-binding" }),
    payrollResolveArtifactSecret: async () => "cut007-tenant-binding-payroll-artifact-secret",
  });
  t.after(() => new Promise((resolve) => started.server.close(resolve)));
  const response = await fetch(`http://${started.host}:${started.port}/api/auth/password-reset/request`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ email: "unknown-cut007-account@example.invalid" }),
  });
  assert.equal(response.status, 200);
  assert.deepEqual(
    await started.sessionAuth.processPasswordResetQueue({ tenantId: TENANTS[0] }),
    { claimed: 1, completed: 0, dropped: 1, retry: 0 },
  );
});

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
  await runRecordRepositoryDomainCommand({
    ledger: createPostgresDomainLedger({ pool: fixture.appPool }),
    descriptor: CRM_DOMAIN_DESCRIPTOR,
    tenant_id: TENANTS[0],
    create_repository: createCrmRuntimeRepository,
    command(repository) {
      return transitionOpportunityStage({
        repository,
        tenant_id: TENANTS[0],
        opportunity_id: "opportunity-lawos-staging",
        next_stage: "intake_requested",
        actor_id: ACCOUNT_INPUTS[0].user_id,
        idempotency_key: "cut007-prior-attempt-opportunity-transition",
        patch: { intake_request_id: "intake-cut007-prior-attempt" },
      });
    },
  });

  const delivered = new Map();
  const storage = createLocalStorageAdapter({ adapter_id: "cut007-disposable-postgres" });
  let authClock = Date.parse("2026-07-20T00:00:00.000Z");
  const identityRepository = createPostgresIdentityLedger({ pool: fixture.appPool, clock: () => authClock });
  const provisionedAdmin = await identityRepository.findDirectoryUserByEmail({ tenant_id: TENANTS[0], email: ACCOUNT_INPUTS[0].email });
  assert.ok(provisionedAdmin.scopes.includes("hrx.employee.read"));
  assert.ok(provisionedAdmin.hrx_scopes.includes("hrx.employee.read"));
  const sessionSecret = "cut007-disposable-session-secret-with-adequate-length";
  let started = null;
  let baseUrl = null;
  let activeSessionAuth = null;
  let activeTransport = null;
  let gatewayCapacityFailureInjected = false;
  const governanceWindows = [];

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
      now: () => authClock,
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
    activeTransport = createPrivateStagingHttpTransport({
      baseUrl,
      throttleRetryWaitMs: 0,
      fetchImpl: async (input, init) => {
        const url = new URL(input);
        if (!gatewayCapacityFailureInjected && url.pathname === "/master-data/client-groups/client-group-lawos-staging") {
          gatewayCapacityFailureInjected = true;
          return { status: 503, json: async () => ({ message: "Service Unavailable" }) };
        }
        return fetch(input, init);
      },
    });
  }

  async function stop() {
    if (!started) return;
    await new Promise((resolve) => started.server.close(resolve));
    started = null;
  }

  await start();
  t.after(stop);
  const executeFlow = (runId) => runPrivateStagingCut007({
    transport: (request) => {
      if (request.path === "/api/intake/clearance-tokens") {
        governanceWindows.push({ clearance_expires_at: request.body?.token?.expires_at });
      } else if (request.path?.endsWith("/retention-policies")) {
        governanceWindows.at(-1).retain_until = request.body?.retain_until;
      }
      return activeTransport(request);
    },
    accounts: ACCOUNT_INPUTS,
    tenantIds: TENANTS,
    runId,
    resetExpiryWaitMs: 45,
    wait: async (milliseconds) => { authClock += milliseconds; },
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
      api_request_count: 64,
      console_error_count: 0,
      failed_request_count: 0,
      evidence_fingerprint: "b".repeat(64),
    }),
  });

  const results = [await executeFlow("cut007-disposable-full-flow-a")];
  await stop();
  await runPrivateStagingSyntheticBaseline({
    pool: fixture.appPool,
    tenantIds: TENANTS,
    accountSeed: sources.account_seed,
    roster: sources.roster,
  });
  delivered.clear();
  await start();
  results.push(await executeFlow("cut007-disposable-full-flow-b"));

  assert.equal(gatewayCapacityFailureInjected, true);
  assert.equal(governanceWindows.length, 2);
  for (const window of governanceWindows) {
    assert.ok(Date.parse(window.retain_until) - Date.parse(window.clearance_expires_at) >= 22 * 24 * 60 * 60 * 1000);
  }
  assert.deepEqual(results.map((result) => result.safe_counts.capacity_retry_count), [1, 0]);
  for (const result of results) {
    assert.equal(result.outcome, "PASS");
    assert.equal(result.data_scope, "synthetic-only");
    assert.equal(result.safe_counts.account_count, 3);
    assert.equal(result.safe_counts.document_count, 2);
    assert.ok(result.safe_counts.api_call_count > 50);
    assert.ok(result.safe_counts.api_call_count <= 96);
    assert.equal(result.browser_smoke.api_request_count, 64);
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
  }
});
