import assert from "node:assert/strict";
import test from "node:test";

import {
  createAnalyticsRepository,
} from "../../../packages/analytics/src/runtime-repository.js";
import {
  createLocalStorageAdapter,
} from "../../../packages/dms/src/storage/local-storage-adapter.js";
import {
  runHrxPostgresMigrations,
} from "../../../packages/hrx/src/postgres-migrations.js";
import {
  hashDomainValue,
} from "../../../packages/persistence/src/domain-ledger.js";
import {
  createPostgresDomainLedger,
} from "../../../packages/persistence/src/postgres/domain-ledger.js";
import {
  createMigratedPostgresFixture,
} from "../../../packages/persistence/test/helpers/disposable-postgres.js";
import {
  createAnalyticsRuntimeContext,
} from "../src/analytics-runtime-context.js";
import {
  CLIENT_OPERATIONS_SCHEMA_MANIFEST,
  readClientOperationsMigrationReadiness,
  runClientOperationsMigration,
  runClientOperationsPostgresMigrations,
} from "../src/client-operations-migration.js";
import {
  CLIENT_OPERATIONS_READINESS_KEY,
} from "../src/client-operations-readiness.js";
import {
  createApiSessionAuth,
} from "../src/session-auth.js";
import { startApiServer } from "../src/server.js";
import {
  CLIENT_MIGRATION_CLIENT_GROUP_ID,
  CLIENT_MIGRATION_TENANT,
  clientOperationSources,
  importClientDirectory,
  importHrxBaseline,
} from "./helpers/client-operations-migration-fixture.js";
import { apiSessionHeaders } from "./helpers/session.js";

const SESSION_SECRET =
  "client-migration-t03-session-secret-material";

function query(tenantId = CLIENT_MIGRATION_TENANT) {
  return new URLSearchParams({
    tenant_id: tenantId,
    permission_ref: "client-operations-migration-readback",
    audit_hint_ref: "client-operations-migration-audit",
    as_of: "2026-07-31T03:00:00.000Z",
    revenue_ranking_period: "year",
  }).toString();
}

async function dashboard(started, tenantId) {
  const baseUrl = `http://${started.host}:${started.port}`;
  const headers = await apiSessionHeaders(baseUrl);
  const response = await fetch(
    `${baseUrl}/api/analytics/clients/dashboard?${query(tenantId)}`,
    { headers },
  );
  return {
    status: response.status,
    body: await response.json(),
  };
}

function stableSections(value) {
  if (Array.isArray(value)) return value.map(stableSections);
  if (!value || typeof value !== "object") return value;
  return Object.fromEntries(
    Object.entries(value)
      .filter(([key]) => ![
        "generated_at",
        "checked_at",
      ].includes(key))
      .map(([key, item]) => [key, stableSections(item)]),
  );
}

test("HTTP Client dashboard selects intentionally distinct providers", async (t) => {
  let active = false;
  const provider = (authority, marker) => Object.freeze({
    authority,
    readDashboard() {
      return Object.freeze({
        access_scope: Object.freeze({
          access_state: "all_clients",
        }),
        item: Object.freeze({ provider_marker: marker }),
        downstream_sources_read: true,
      });
    },
  });
  const runtime = createAnalyticsRuntimeContext({
    repository: createAnalyticsRepository(),
    clientOperationsLegacyReadProvider:
      provider("legacy-test-provider", "legacy"),
    clientOperationsV2ReadProvider:
      provider("postgres-test-provider", "v2"),
    clientOperationsReadPathSelector: async () => ({
      feature_flag: "client_dashboard_v2",
      active,
      read_path: active
        ? "client-operations-v2"
        : "legacy-client-v1",
      reason: "test-selector",
      postgres_records_preserved: true,
      destructive_rollback: false,
      verification_source: "test",
      caller_verification_accepted: false,
    }),
  });
  const started = await startApiServer({
    port: 0,
    analyticsRuntime: runtime,
    sessionSecret: SESSION_SECRET,
  });
  t.after(() => new Promise(
    (resolve) => started.server.close(resolve),
  ));
  const legacy = await dashboard(started);
  assert.equal(legacy.status, 200);
  assert.equal(legacy.body.provider_marker, "legacy");
  assert.equal(
    legacy.body.client_operations_read_path.provider_authority,
    "legacy-test-provider",
  );
  active = true;
  const v2 = await dashboard(started);
  assert.equal(v2.status, 200);
  assert.equal(v2.body.provider_marker, "v2");
  assert.equal(
    v2.body.client_operations_read_path.provider_authority,
    "postgres-test-provider",
  );
});

test("operational Client providers preserve parity, drift safety, and rollback data", async (t) => {
  const fixture = await createMigratedPostgresFixture(t);
  if (!fixture) return;
  const ledger = createPostgresDomainLedger({
    pool: fixture.appPool,
  });
  await importClientDirectory(ledger);
  await importHrxBaseline(ledger);
  const pool = {
    query: fixture.appPool.query.bind(fixture.appPool),
    connect: fixture.appPool.connect.bind(fixture.appPool),
    end: async () => {},
  };
  const sessionAuth = createApiSessionAuth({
    profile: "local-dev",
    secret: SESSION_SECRET,
  });
  const startedServers = [];
  t.after(async () => {
    for (const started of startedServers) {
      if (!started.server.listening) continue;
      await new Promise(
        (resolve) => started.server.close(resolve),
      );
    }
  });
  async function start({
    featureValue,
    untrustedVerifier,
  } = {}) {
    const started = await startApiServer({
      port: 0,
      runtimeProfile: "operational",
      sessionSecret: SESSION_SECRET,
      staffAuthAuthority: "internal-password",
      sessionAuth,
      stepUpAuthority: Object.freeze({}),
      persistenceAuthority: "postgres-v2",
      persistenceAuthorityEnv: {
        LAWOS_POSTGRES_URL_SECRET_ID:
          "lawos/test/client-migration-t03",
        LAWOS_POSTGRES_TENANT_CONTEXT_SECRET_ID:
          "lawos/test/client-migration-t03-tenant-context",
        LAWOS_PAYROLL_ARTIFACT_KEY_SECRET_ID:
          "lawos/test/client-migration-t03-payroll-key",
        LAWOS_DATA_SCOPE: "synthetic-only",
        AWS_REGION: "ap-northeast-2",
        ...(featureValue === undefined
          ? {}
          : {
              LAWOS_CLIENT_OPERATIONS_V2_ENABLED:
                featureValue,
            }),
      },
      persistenceResolvePostgresSecret: async ({ secretId }) =>
        secretId.endsWith("tenant-context")
          ? fixture.tenantContextSecret
          : fixture.instance.connection_string,
      persistenceConnectPostgres: async () => pool,
      ...(untrustedVerifier
        ? {
            persistenceVerifyPostgresMigrations:
              untrustedVerifier,
          }
        : {}),
      dmsStorage: createLocalStorageAdapter({
        adapter_id: "client-migration-t03-api",
      }),
      payrollResolveArtifactSecret: async () =>
        "client-migration-t03-payroll-secret-material",
    });
    startedServers.push(started);
    return started;
  }
  async function close(started) {
    if (!started.server.listening) return;
    await new Promise(
      (resolve) => started.server.close(resolve),
    );
  }
  async function storageDigest() {
    const [records, imports, readiness] = await Promise.all([
      fixture.adminPool.query(
        `SELECT domain_id, record_type, record_id,
                state_version, payload_hash
           FROM lawos_domain.records
          WHERE tenant_id = $1
            AND domain_id = ANY($2::text[])
          ORDER BY domain_id, record_type, record_id`,
        [
          CLIENT_MIGRATION_TENANT,
          ["crm", "finance", "email-dms"],
        ],
      ),
      fixture.adminPool.query(
        `SELECT domain_id, source_hash, snapshot_hash,
                source_count, target_count, status
           FROM lawos_domain.import_receipts
          WHERE tenant_id = $1
          ORDER BY domain_id, source_hash`,
        [CLIENT_MIGRATION_TENANT],
      ),
      fixture.adminPool.query(
        `SELECT domain_id, idempotency_key, request_hash,
                response
           FROM lawos_domain.idempotency_keys
          WHERE tenant_id = $1
            AND idempotency_key = $2`,
        [CLIENT_MIGRATION_TENANT, CLIENT_OPERATIONS_READINESS_KEY],
      ),
    ]);
    return hashDomainValue({
      records: records.rows,
      imports: imports.rows,
      readiness: readiness.rows,
    });
  }

  let forgedVerifierCalls = 0;
  await assert.rejects(
    start({
      featureValue: "true",
      untrustedVerifier: async () => {
        forgedVerifierCalls += 1;
        return [];
      },
    }),
    /selected PostgreSQL authority failed initialization/u,
  );
  assert.equal(forgedVerifierCalls, 0);
  await runHrxPostgresMigrations(fixture.adminPool);
  await runClientOperationsPostgresMigrations(
    fixture.adminPool,
  );
  const migrated = await runClientOperationsMigration({
    ledger,
    pool: fixture.appPool,
    snapshots: clientOperationSources(),
    tenant_id: CLIENT_MIGRATION_TENANT,
  });
  assert.equal(migrated.readback.verified, true);
  const migratedStorageDigest = await storageDigest();

  const defaultOff = await start();
  assert.equal(
    defaultOff.persistence_authority
      .client_operations_v2_enabled,
    false,
  );
  const legacy = await dashboard(defaultOff);
  assert.equal(legacy.status, 200);
  assert.equal(
    legacy.body.client_operations_read_path.provider_authority,
    "legacy-request-repositories",
  );
  const crossTenant = await dashboard(
    defaultOff,
    "tenant_client_migration_wrong",
  );
  assert.equal(crossTenant.status, 403);
  assert.equal(
    crossTenant.body.client_operations_read_path,
    undefined,
  );
  await close(defaultOff);

  const enabled = await start({ featureValue: "true" });
  assert.equal(
    enabled.persistence_authority.client_operations_v2_enabled,
    true,
  );
  const postgres = await dashboard(enabled);
  assert.equal(postgres.status, 200, JSON.stringify(postgres.body));
  assert.equal(
    postgres.body.client_operations_read_path.provider_authority,
    "postgres-domain-ledger-snapshot",
  );
  assert.deepEqual(
    stableSections(postgres.body.sections),
    stableSections(legacy.body.sections),
  );
  assert.equal(
    postgres.body.sections.kpis.data.values.receivables_total,
    5_000_000,
  );
  assert.deepEqual(
    postgres.body.sections.receivables_ranking.data
      .client_group_ids,
    [CLIENT_MIGRATION_CLIENT_GROUP_ID],
  );

  const finalSchema =
    CLIENT_OPERATIONS_SCHEMA_MANIFEST.entries.at(-1);
  await fixture.adminPool.query(
    `UPDATE lawos_meta.schema_migrations
        SET checksum = $1
      WHERE migration_id = $2`,
    ["0".repeat(64), finalSchema.id],
  );
  const drift = await dashboard(enabled);
  assert.equal(drift.status, 200);
  assert.equal(
    drift.body.client_operations_read_path.reason,
    "postgres_schema_verification_failed",
  );
  assert.equal(
    drift.body.client_operations_read_path.provider_authority,
    "legacy-request-repositories",
  );
  await fixture.adminPool.query(
    `UPDATE lawos_meta.schema_migrations
        SET checksum = $1
      WHERE migration_id = $2`,
    [finalSchema.checksum, finalSchema.id],
  );
  await close(enabled);

  const rollback = await start({ featureValue: "false" });
  const rolledBack = await dashboard(rollback);
  assert.equal(rolledBack.status, 200);
  assert.equal(
    rolledBack.body.client_operations_read_path.provider_authority,
    "legacy-request-repositories",
  );
  await close(rollback);
  assert.equal(await storageDigest(), migratedStorageDigest);

  const currentLead = await ledger.read({
    tenant_id: CLIENT_MIGRATION_TENANT,
    domain_id: "crm",
    record_type: "Lead",
    record_id: "lead_migration_t03",
  });
  await ledger.write({
    ...currentLead,
    expected_version: currentLead.state_version,
    payload: {
      ...currentLead.payload,
      next_action: "attestation 이후 합성 변경",
    },
  });
  const stale = await readClientOperationsMigrationReadiness({
    ledger,
    pool: fixture.appPool,
    tenant_id: CLIENT_MIGRATION_TENANT,
  });
  assert.equal(stale.verified, false);
  assert.equal(
    stale.readiness_reason,
    "postgres_migration_attestation_stale",
  );
  const staleServer = await start({ featureValue: "true" });
  const staleRead = await dashboard(staleServer);
  assert.equal(staleRead.status, 200);
  assert.equal(
    staleRead.body.client_operations_read_path.reason,
    "postgres_migration_attestation_stale",
  );
  assert.equal(
    staleRead.body.client_operations_read_path.provider_authority,
    "legacy-request-repositories",
  );
  await close(staleServer);
});
