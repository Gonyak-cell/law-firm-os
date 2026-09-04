import assert from "node:assert/strict";
import test from "node:test";
import { createAwsExternalReadCredentialVault } from "../../../apps/api/src/external-read-credential-vault.js";
import { createPostgresRepositoryPortV2 } from "../../persistence/src/postgres/repository-v2.js";
import { createMigratedPostgresFixture } from "../../persistence/test/helpers/disposable-postgres.js";
import {
  EXTERNAL_READ_PROVIDER_PACK_SCHEMA_VERSION,
  createExternalReadProviderOnboardingService,
  createExternalReadProviderPackCatalog,
  createExternalReadProviderRegistry,
  createRepositoryPortV2ExternalReadOnboardingRepository,
} from "../src/index.js";

const TENANT = "tenant_lawos_staging_external_read_a";
const ENTITY = "company-synthetic-a";
const NOW = "2026-09-03T13:00:00.000Z";

function providerPack() {
  return {
    schema_version: EXTERNAL_READ_PROVIDER_PACK_SCHEMA_VERSION,
    provider_id: "future-disclosure",
    display_name: "Future Disclosure (synthetic)",
    adapter_version: "1.0.0",
    base_url: "https://future-disclosure.invalid",
    auth: {
      type: "api_key",
      placement: "header",
      header_name: "X-Api-Key",
    },
    probe_capability: "disclosure.filings.read",
    capabilities: [{
      capability: "disclosure.filings.read",
      path: "/v1/filings",
      items_path: ["filings"],
      field_map: {
        external_id: ["id"],
        published_at: ["published_at"],
        title: ["title"],
      },
      required_fields: ["external_id", "published_at", "title"],
      max_items: 20,
    }],
  };
}

function secretsClient() {
  const values = new Map();
  const commands = [];
  return {
    values,
    commands,
    async send(command) {
      commands.push(command);
      const name = command.constructor.name;
      if (name === "CreateSecretCommand") {
        if (values.has(command.input.Name)) {
          throw Object.assign(new Error("exists"), { name: "ResourceExistsException" });
        }
        values.set(command.input.Name, command.input.SecretString);
        return {};
      }
      if (name === "GetSecretValueCommand") {
        return { SecretString: values.get(command.input.SecretId) };
      }
      if (name === "PutSecretValueCommand") {
        values.set(command.input.SecretId, command.input.SecretString);
        return {};
      }
      if (name === "DeleteSecretCommand") return {};
      throw new Error(`Unexpected command: ${name}`);
    },
  };
}

test("operational API-key onboarding persists a tenant/entity connection, first sync, audit, and outbox atomically", async (t) => {
  const fixture = await createMigratedPostgresFixture(t);
  if (!fixture) return;
  const repositoryPort = createPostgresRepositoryPortV2({
    pool: fixture.appPool,
    clock: () => new Date(NOW),
  });
  const repository = createRepositoryPortV2ExternalReadOnboardingRepository({
    repository: repositoryPort,
  });
  assert.equal(repository.operational, true);

  const secretClient = secretsClient();
  let secretRequest = 0;
  const credentialVault = createAwsExternalReadCredentialVault({
    region: "ap-northeast-2",
    secret_prefix: "lawos/test/external-read-postgres",
    kms_key_id:
      "arn:aws:kms:ap-northeast-2:770880870480:key/11111111-2222-3333-4444-555555555555",
    client: secretClient,
    idFactory: () => `00000000-0000-4000-8000-${String(++secretRequest).padStart(12, "0")}`,
  });
  const catalog = createExternalReadProviderPackCatalog({ packs: [providerPack()] });
  let providerCalls = 0;
  const registry = createExternalReadProviderRegistry({
    providers: catalog.providers({
      resolve_credential: (input) => credentialVault.resolveApiKey(input),
      clock: () => NOW,
      fetch_impl: async (_url, options) => {
        providerCalls += 1;
        const key = options.headers["X-Api-Key"];
        assert.ok(["postgres-synthetic-key", "postgres-rotated-key"].includes(key));
        return new Response(JSON.stringify({
          filings: [{
            id: key === "postgres-synthetic-key" ? "filing-001" : "filing-rotated-002",
            published_at: "2026-09-03T12:55:00.000Z",
            title: "Synthetic filing",
          }],
        }), { status: 200, headers: { "content-type": "application/json" } });
      },
    }),
  });
  let id = 0;
  const service = createExternalReadProviderOnboardingService({
    catalog,
    provider_registry: registry,
    credential_vault: credentialVault,
    repository,
    operational: true,
    idFactory: () => `postgres-synthetic-${++id}`,
    clock: () => NOW,
  });
  const input = {
    tenant_id: TENANT,
    legal_entity_id: ENTITY,
    provider_id: "future-disclosure",
    actor_id: "admin-synthetic",
    idempotency_key: "external-read-postgres-e2e-001",
    api_key: "postgres-synthetic-key",
  };

  const result = await service.onboardApiKey(input);
  const replay = await service.onboardApiKey(input);
  const snapshot = await service.readFirstSync({
    tenant_id: TENANT,
    legal_entity_id: ENTITY,
    connection_id: result.connection_id,
  });

  assert.equal(result.state, "ready");
  assert.equal(replay.replayed, true);
  assert.equal(replay.connection_id, result.connection_id);
  assert.equal(providerCalls, 1);
  assert.equal(snapshot.item_count, 1);
  assert.equal(snapshot.items[0].external_id, "filing-001");
  assert.equal(JSON.stringify(result).includes("postgres-synthetic-key"), false);
  assert.equal(JSON.stringify(snapshot).includes("postgres-synthetic-key"), false);

  const records = await fixture.adminPool.query(
    `SELECT record_type, data::text AS data
       FROM lawos_runtime.records
      WHERE tenant_id = $1
      ORDER BY record_type`,
    [TENANT],
  );
  assert.deepEqual(records.rows.map(({ record_type }) => record_type), [
    "external_read_connection",
    "external_read_snapshot",
  ]);
  assert.equal(records.rows.some(({ data }) => data.includes("postgres-synthetic-key")), false);
  const audit = await fixture.adminPool.query(
    "SELECT event_type, payload::text AS payload FROM lawos_runtime.audit_events WHERE tenant_id = $1 ORDER BY created_at, event_id",
    [TENANT],
  );
  assert.deepEqual(audit.rows.map(({ event_type }) => event_type).sort(), [
    "external_read.onboarding.claimed",
    "external_read.onboarding.completed",
    "external_read.onboarding.credential_staged",
  ].sort());
  assert.equal(audit.rows.some(({ payload }) => payload.includes("postgres-synthetic-key")), false);
  const outbox = await fixture.adminPool.query(
    "SELECT topic, payload::text AS payload FROM lawos_runtime.outbox_events WHERE tenant_id = $1",
    [TENANT],
  );
  assert.equal(outbox.rows[0]?.topic, "external_read.connection.ready");
  assert.equal(outbox.rows[0]?.payload.includes("postgres-synthetic-key"), false);

  const lifecycleBase = {
    tenant_id: TENANT,
    legal_entity_id: ENTITY,
    connection_id: result.connection_id,
    actor_id: "admin-synthetic",
  };
  const synced = await service.syncConnection({ ...lifecycleBase, idempotency_key: "postgres-sync-001" });
  const syncReplay = await service.syncConnection({ ...lifecycleBase, idempotency_key: "postgres-sync-001" });
  const disabled = await service.disableConnection({ ...lifecycleBase, idempotency_key: "postgres-disable-001" });
  const reconnected = await service.reconnectConnection({ ...lifecycleBase, idempotency_key: "postgres-reconnect-001" });
  const rotated = await service.rotateApiKey({
    ...lifecycleBase,
    idempotency_key: "postgres-rotate-001",
    api_key: "postgres-rotated-key",
  });
  const latest = await service.readLatestSync(lifecycleBase);
  const revoked = await service.revokeConnection({ ...lifecycleBase, idempotency_key: "postgres-revoke-001" });

  assert.equal(synced.connection.state, "ready");
  assert.equal(syncReplay.replayed, true);
  assert.equal(disabled.connection.state, "disabled");
  assert.equal(reconnected.connection.state, "ready");
  assert.equal(rotated.connection.state, "ready");
  assert.deepEqual(latest.items.map(({ external_id }) => external_id), ["filing-rotated-002"]);
  assert.equal(revoked.connection.state, "revoked");
  assert.equal(revoked.connection.credential_configured, false);
  assert.equal(providerCalls, 4);

  const lifecycleRecords = await fixture.adminPool.query(
    `SELECT record_type, data::text AS data
       FROM lawos_runtime.records
      WHERE tenant_id = $1
      ORDER BY record_type, record_id`,
    [TENANT],
  );
  assert.equal(lifecycleRecords.rows.filter(({ record_type }) => record_type === "external_read_operation").length, 5);
  assert.equal(lifecycleRecords.rows.filter(({ record_type }) => record_type === "external_read_snapshot").length, 4);
  assert.equal(lifecycleRecords.rows.some(({ data }) => data.includes("postgres-synthetic-key")), false);
  assert.equal(lifecycleRecords.rows.some(({ data }) => data.includes("postgres-rotated-key")), false);

  const lifecycleAudit = await fixture.adminPool.query(
    "SELECT event_type, payload::text AS payload FROM lawos_runtime.audit_events WHERE tenant_id = $1 ORDER BY created_at, event_id",
    [TENANT],
  );
  for (const eventType of [
    "external_read.lifecycle.sync.completed",
    "external_read.lifecycle.disable.completed",
    "external_read.lifecycle.reconnect.completed",
    "external_read.lifecycle.rotate.completed",
    "external_read.lifecycle.revoke.completed",
  ]) {
    assert.ok(lifecycleAudit.rows.some(({ event_type }) => event_type === eventType), eventType);
  }
  assert.equal(lifecycleAudit.rows.some(({ payload }) => payload.includes("postgres-rotated-key")), false);

  const lifecycleOutbox = await fixture.adminPool.query(
    "SELECT topic, payload::text AS payload FROM lawos_runtime.outbox_events WHERE tenant_id = $1 ORDER BY topic, event_id",
    [TENANT],
  );
  for (const topic of [
    "external_read.connection.ready",
    "external_read.connection.synchronized",
    "external_read.connection.disabled",
    "external_read.connection.reconnected",
    "external_read.connection.rotated",
    "external_read.connection.revoked",
  ]) {
    assert.ok(lifecycleOutbox.rows.some((row) => row.topic === topic), topic);
  }
  assert.equal(lifecycleOutbox.rows.some(({ payload }) => payload.includes("postgres-synthetic-key")), false);
  assert.equal(lifecycleOutbox.rows.some(({ payload }) => payload.includes("postgres-rotated-key")), false);
});
