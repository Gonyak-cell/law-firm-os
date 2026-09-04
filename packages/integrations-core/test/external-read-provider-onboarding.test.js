import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import test from "node:test";
import {
  EXTERNAL_READ_PROVIDER_PACK_SCHEMA_VERSION,
  createExternalReadProviderOnboardingService,
  createExternalReadProviderPackCatalog,
  createExternalReadProviderRegistry,
  createTestExternalReadOnboardingRepository,
} from "../src/index.js";

const NOW = "2026-09-03T12:00:00.000Z";
const INPUT = Object.freeze({
  tenant_id: "tenant-synthetic",
  legal_entity_id: "company-synthetic",
  provider_id: "future-bank",
  actor_id: "admin-synthetic",
  idempotency_key: "connect-future-bank-001",
  api_key: "synthetic-key-never-log",
});

function pack() {
  return {
    schema_version: EXTERNAL_READ_PROVIDER_PACK_SCHEMA_VERSION,
    provider_id: "future-bank",
    display_name: "Future Bank (synthetic)",
    adapter_version: "1.0.0",
    base_url: "https://future-bank.invalid",
    auth: {
      type: "api_key",
      placement: "header",
      header_name: "X-Api-Key",
      value_prefix: "",
    },
    probe_capability: "bank.transactions.read",
    capabilities: [{
      capability: "bank.transactions.read",
      path: "/v1/transactions",
      items_path: ["transactions"],
      field_map: {
        external_id: ["id"],
        amount: ["amount"],
      },
      required_fields: ["external_id", "amount"],
      max_items: 10,
    }],
  };
}

function fakeVault({ cleanupFails = false, operational = false } = {}) {
  const secrets = new Map();
  let cleanupFailure = cleanupFails;
  let stores = 0;
  let revokes = 0;
  const ref = ({ tenant_id, legal_entity_id, connection_id, provider_id, credential_generation = "initial" }) =>
    `aws-secrets-manager:test/external/${createHash("sha256").update(JSON.stringify({
      tenant_id,
      legal_entity_id,
      connection_id,
      provider_id,
    })).digest("hex")}/${credential_generation}`;
  return {
    operational,
    get stores() { return stores; },
    get revokes() { return revokes; },
    get secretCount() { return secrets.size; },
    setCleanupFails(value) { cleanupFailure = value === true; },
    referenceForConnection: ref,
    async storeApiKey(input) {
      stores += 1;
      const credentialRef = ref(input);
      const previous = secrets.get(credentialRef);
      if (previous && previous.api_key !== input.api_key) {
        throw Object.assign(new Error("synthetic generation conflict"), {
          safe_error_code: "EXTERNAL_READ_CREDENTIAL_GENERATION_CONFLICT",
          status: 409,
        });
      }
      secrets.set(credentialRef, {
        scope: {
          tenant_id: input.tenant_id,
          legal_entity_id: input.legal_entity_id,
          connection_id: input.connection_id,
          provider_id: input.provider_id,
        },
        api_key: input.api_key,
      });
      return credentialRef;
    },
    async resolveApiKey(input) {
      const secret = secrets.get(input.credential_ref);
      assert.deepEqual(secret?.scope, {
        tenant_id: input.tenant_id,
        legal_entity_id: input.legal_entity_id,
        connection_id: input.connection_id,
        provider_id: input.provider_id,
      });
      return { api_key: secret.api_key };
    },
    async revokeApiKey(input) {
      revokes += 1;
      if (cleanupFailure) throw new Error("synthetic cleanup failure");
      secrets.delete(input.credential_ref);
      return { credential_ref: input.credential_ref, deletion_scheduled: true };
    },
  };
}

function createOnboardingFixture({
  responseStatus = 200,
  cleanupFails = false,
  operational = false,
  fetchImpl,
} = {}) {
  const vault = fakeVault({ cleanupFails, operational });
  const catalog = createExternalReadProviderPackCatalog({ packs: [pack()] });
  let fetches = 0;
  const providerFetch = async (...args) => {
    fetches += 1;
    if (fetchImpl) return fetchImpl(...args);
    const [_url, options] = args;
    assert.equal(options.headers["X-Api-Key"], INPUT.api_key);
    return new Response(JSON.stringify({
      transactions: [{ id: "transaction-001", amount: 12345 }],
    }), {
      status: responseStatus,
      headers: { "content-type": "application/json" },
    });
  };
  const registry = createExternalReadProviderRegistry({
    providers: catalog.providers({
      fetch_impl: providerFetch,
      resolve_credential: (input) => vault.resolveApiKey(input),
      clock: () => NOW,
    }),
  });
  const repository = createTestExternalReadOnboardingRepository({ clock: () => NOW });
  let id = 0;
  const service = createExternalReadProviderOnboardingService({
    catalog,
    provider_registry: registry,
    credential_vault: vault,
    repository,
    idFactory: () => `synthetic-${++id}`,
    clock: () => NOW,
    operational,
  });
  return { catalog, registry, repository, service, vault, get fetches() { return fetches; } };
}

test("an approved API-key pack completes secret storage, connection probe, first sync, and readback", async () => {
  const runtime = createOnboardingFixture();
  const result = await runtime.service.onboardApiKey(INPUT);

  assert.equal(result.state, "ready");
  assert.equal(result.credential_configured, true);
  assert.equal(result.first_sync.item_count, 1);
  assert.match(result.first_sync.provider_receipt_ref, /^ProviderReceipt:future-bank\//u);
  assert.match(result.first_sync.sync_receipt_ref, /^SyncReceipt:future-bank\//u);
  assert.equal("next_checkpoint_ref" in result.first_sync, false);
  assert.match(result.audit_receipt_ref, /^AuditReceipt:external-read\//u);
  assert.equal(result.credential_material_included, false);
  assert.equal(JSON.stringify(result).includes(INPUT.api_key), false);
  assert.equal(runtime.vault.stores, 1);
  assert.equal(runtime.fetches, 1);

  const snapshot = await runtime.service.readFirstSync({
    tenant_id: INPUT.tenant_id,
    legal_entity_id: INPUT.legal_entity_id,
    connection_id: result.connection_id,
  });
  assert.deepEqual(snapshot.items, [{ external_id: "transaction-001", amount: 12345 }]);
  assert.equal(snapshot.item_count, 1);
  assert.equal(snapshot.credential_material_included, false);
  assert.equal(snapshot.raw_provider_payload_included, false);
  assert.equal("next_checkpoint_ref" in snapshot, false);
});

test("an idempotent replay returns the same receipt without storing or calling the provider twice", async () => {
  const runtime = createOnboardingFixture();
  const first = await runtime.service.onboardApiKey(INPUT);
  const replay = await runtime.service.onboardApiKey(INPUT);

  assert.equal(replay.connection_id, first.connection_id);
  assert.equal(replay.first_sync.sync_receipt_ref, first.first_sync.sync_receipt_ref);
  assert.equal(replay.replayed, true);
  assert.equal(runtime.vault.stores, 1);
  assert.equal(runtime.fetches, 1);
});

test("an idempotency key cannot be reused with different credential material", async () => {
  const runtime = createOnboardingFixture();
  await runtime.service.onboardApiKey(INPUT);
  await assert.rejects(
    runtime.service.onboardApiKey({ ...INPUT, api_key: "different-synthetic-key" }),
    (error) => error.safe_error_code === "IDEMPOTENCY_KEY_REUSED",
  );
  assert.equal(runtime.vault.stores, 1);
  assert.equal(runtime.fetches, 1);
});

test("a rejected credential is tombstoned and leaves a non-ready failure receipt", async () => {
  const runtime = createOnboardingFixture({ responseStatus: 401 });
  await assert.rejects(
    runtime.service.onboardApiKey(INPUT),
    (error) => {
      assert.equal(error.safe_error_code, "EXTERNAL_READ_PROVIDER_VALIDATION_FAILED");
      assert.equal(error.connection.state, "failed");
      assert.equal(error.connection.credential_configured, false);
      assert.equal(JSON.stringify(error.connection).includes(INPUT.api_key), false);
      return true;
    },
  );
  assert.equal(runtime.vault.revokes, 1);
  assert.equal(runtime.fetches, 1);
});

test("a credential cleanup failure is visible as repair_required and never reported ready", async () => {
  const runtime = createOnboardingFixture({ responseStatus: 401, cleanupFails: true });
  await assert.rejects(
    runtime.service.onboardApiKey(INPUT),
    (error) => {
      assert.equal(error.safe_error_code, "EXTERNAL_READ_ONBOARDING_REPAIR_REQUIRED");
      assert.equal(error.connection.state, "repair_required");
      assert.equal(error.connection.safe_error_code, "EXTERNAL_READ_CREDENTIAL_CLEANUP_REQUIRED");
      assert.equal(error.connection.credential_configured, true);
      return true;
    },
  );
});

test("unknown providers and malformed keys fail before a secret or external request exists", async () => {
  const runtime = createOnboardingFixture();
  await assert.rejects(
    runtime.service.onboardApiKey({ ...INPUT, provider_id: "unknown-bank" }),
    (error) => error.safe_error_code === "EXTERNAL_READ_PROVIDER_UNAVAILABLE",
  );
  await assert.rejects(
    runtime.service.onboardApiKey({ ...INPUT, api_key: " whitespace " }),
    /api_key is invalid/u,
  );
  await assert.rejects(
    runtime.service.onboardApiKey({ ...INPUT, api_key: "line\nbreak" }),
    /api_key is invalid/u,
  );
  assert.equal(runtime.vault.stores, 0);
  assert.equal(runtime.fetches, 0);
});

test("operational mode rejects test-only credential and connection stores", () => {
  const vault = fakeVault({ operational: false });
  const catalog = createExternalReadProviderPackCatalog({ packs: [pack()] });
  assert.throws(() => createExternalReadProviderOnboardingService({
    catalog,
    provider_registry: createExternalReadProviderRegistry({
      providers: catalog.providers({
        fetch_impl: async () => new Response("{}", { status: 200 }),
        resolve_credential: (input) => vault.resolveApiKey(input),
      }),
    }),
    credential_vault: vault,
    repository: createTestExternalReadOnboardingRepository(),
    operational: true,
  }), /credential vault must be operational/u);
});

test("first-sync readback is legal-entity scoped and does not leak existence across a boundary", async () => {
  const runtime = createOnboardingFixture();
  const connected = await runtime.service.onboardApiKey(INPUT);
  await assert.rejects(
    runtime.service.readFirstSync({
      tenant_id: INPUT.tenant_id,
      legal_entity_id: "company-other",
      connection_id: connected.connection_id,
    }),
    (error) => error.safe_error_code === "EXTERNAL_READ_CONNECTION_NOT_FOUND",
  );
});

test("connection lifecycle syncs, disables, reconnects, rotates generations, and revokes idempotently", async () => {
  const runtime = createOnboardingFixture({
    fetchImpl: async (_url, options) => {
      const key = options.headers["X-Api-Key"];
      assert.ok([INPUT.api_key, "rotated-synthetic-key"].includes(key));
      return new Response(JSON.stringify({
        transactions: [{
          id: key === INPUT.api_key ? "transaction-initial" : "transaction-rotated",
          amount: key === INPUT.api_key ? 100 : 200,
        }],
      }), { status: 200, headers: { "content-type": "application/json" } });
    },
  });
  const connected = await runtime.service.onboardApiKey(INPUT);

  const synced = await runtime.service.syncConnection({
    tenant_id: INPUT.tenant_id,
    legal_entity_id: INPUT.legal_entity_id,
    connection_id: connected.connection_id,
    actor_id: INPUT.actor_id,
    idempotency_key: "sync-001",
  });
  const syncReplay = await runtime.service.syncConnection({
    tenant_id: INPUT.tenant_id,
    legal_entity_id: INPUT.legal_entity_id,
    connection_id: connected.connection_id,
    actor_id: INPUT.actor_id,
    idempotency_key: "sync-001",
  });
  assert.equal(synced.operation.state, "completed");
  assert.equal(syncReplay.replayed, true);
  assert.notEqual(synced.connection.latest_sync.sync_receipt_ref, connected.first_sync.sync_receipt_ref);
  assert.equal(runtime.fetches, 2);

  const disabled = await runtime.service.disableConnection({
    tenant_id: INPUT.tenant_id,
    legal_entity_id: INPUT.legal_entity_id,
    connection_id: connected.connection_id,
    actor_id: INPUT.actor_id,
    idempotency_key: "disable-001",
  });
  assert.equal(disabled.connection.state, "disabled");
  await assert.rejects(runtime.service.syncConnection({
    tenant_id: INPUT.tenant_id,
    legal_entity_id: INPUT.legal_entity_id,
    connection_id: connected.connection_id,
    actor_id: INPUT.actor_id,
    idempotency_key: "sync-disabled-001",
  }), (error) => error.safe_error_code === "EXTERNAL_READ_CONNECTION_NOT_AVAILABLE");

  const reconnected = await runtime.service.reconnectConnection({
    tenant_id: INPUT.tenant_id,
    legal_entity_id: INPUT.legal_entity_id,
    connection_id: connected.connection_id,
    actor_id: INPUT.actor_id,
    idempotency_key: "reconnect-001",
  });
  assert.equal(reconnected.connection.state, "ready");

  const rotated = await runtime.service.rotateApiKey({
    tenant_id: INPUT.tenant_id,
    legal_entity_id: INPUT.legal_entity_id,
    connection_id: connected.connection_id,
    actor_id: INPUT.actor_id,
    idempotency_key: "rotate-001",
    api_key: "rotated-synthetic-key",
  });
  const rotateReplay = await runtime.service.rotateApiKey({
    tenant_id: INPUT.tenant_id,
    legal_entity_id: INPUT.legal_entity_id,
    connection_id: connected.connection_id,
    actor_id: INPUT.actor_id,
    idempotency_key: "rotate-001",
    api_key: "rotated-synthetic-key",
  });
  assert.equal(rotated.connection.state, "ready");
  assert.equal(rotated.operation.result.outcome, "rotated");
  assert.match(rotated.operation.result.credential_generation, /^rotation-/u);
  assert.equal(rotateReplay.replayed, true);
  assert.equal(runtime.vault.secretCount, 1);

  const latest = await runtime.service.readLatestSync({
    tenant_id: INPUT.tenant_id,
    legal_entity_id: INPUT.legal_entity_id,
    connection_id: connected.connection_id,
  });
  assert.deepEqual(latest.items, [{ external_id: "transaction-rotated", amount: 200 }]);

  const revoked = await runtime.service.revokeConnection({
    tenant_id: INPUT.tenant_id,
    legal_entity_id: INPUT.legal_entity_id,
    connection_id: connected.connection_id,
    actor_id: INPUT.actor_id,
    idempotency_key: "revoke-001",
  });
  const revokeReplay = await runtime.service.revokeConnection({
    tenant_id: INPUT.tenant_id,
    legal_entity_id: INPUT.legal_entity_id,
    connection_id: connected.connection_id,
    actor_id: INPUT.actor_id,
    idempotency_key: "revoke-001",
  });
  assert.equal(revoked.connection.state, "revoked");
  assert.equal(revoked.connection.credential_configured, false);
  assert.equal(revokeReplay.replayed, true);
  assert.equal(runtime.vault.secretCount, 0);
  assert.equal(JSON.stringify({ synced, disabled, reconnected, rotated, revoked }).includes("synthetic-key"), false);
});

test("failed rotation preserves the old generation and cleanup repair restores readiness", async () => {
  const runtime = createOnboardingFixture({
    fetchImpl: async (_url, options) => new Response(JSON.stringify({
      transactions: [{ id: "transaction-stable", amount: 100 }],
    }), {
      status: options.headers["X-Api-Key"] === INPUT.api_key ? 200 : 401,
      headers: { "content-type": "application/json" },
    }),
  });
  const connected = await runtime.service.onboardApiKey(INPUT);
  runtime.vault.setCleanupFails(true);
  await assert.rejects(runtime.service.rotateApiKey({
    tenant_id: INPUT.tenant_id,
    legal_entity_id: INPUT.legal_entity_id,
    connection_id: connected.connection_id,
    actor_id: INPUT.actor_id,
    idempotency_key: "rotate-repair-001",
    api_key: "rejected-rotated-key",
  }), (error) => {
    assert.equal(error.safe_error_code, "EXTERNAL_READ_OPERATION_REPAIR_REQUIRED");
    assert.equal(error.connection.state, "repair_required");
    return true;
  });
  assert.equal(runtime.vault.secretCount, 2);

  runtime.vault.setCleanupFails(false);
  const repaired = await runtime.service.repairConnection({
    tenant_id: INPUT.tenant_id,
    legal_entity_id: INPUT.legal_entity_id,
    connection_id: connected.connection_id,
    actor_id: INPUT.actor_id,
    idempotency_key: "repair-rotation-001",
  });
  assert.equal(repaired.connection.state, "ready");
  assert.equal(repaired.operation.result.connection_state, "ready");
  assert.equal(runtime.vault.secretCount, 1);

  const synced = await runtime.service.syncConnection({
    tenant_id: INPUT.tenant_id,
    legal_entity_id: INPUT.legal_entity_id,
    connection_id: connected.connection_id,
    actor_id: INPUT.actor_id,
    idempotency_key: "sync-after-repair-001",
  });
  assert.equal(synced.connection.state, "ready");
  const latest = await runtime.service.readLatestSync({
    tenant_id: INPUT.tenant_id,
    legal_entity_id: INPUT.legal_entity_id,
    connection_id: connected.connection_id,
  });
  assert.deepEqual(latest.items, [{ external_id: "transaction-stable", amount: 100 }]);
});
