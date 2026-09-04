import assert from "node:assert/strict";
import test from "node:test";
import {
  EXTERNAL_READ_PROVIDER_SCHEMA_VERSION,
  createExternalReadProviderRegistry,
  normalizeExternalReadConnection,
} from "../src/external-read-provider-registry.js";

function connection(overrides = {}) {
  return {
    schema_version: EXTERNAL_READ_PROVIDER_SCHEMA_VERSION,
    tenant_id: "tenant-a",
    legal_entity_id: "company-a",
    connection_id: "connection-a",
    provider_id: "future-bank",
    state: "ready",
    consent_state: "active",
    credential_ref: "aws-secrets-manager:lawos/tenant-a/future-bank",
    ...overrides,
  };
}

const authorityScope = Object.freeze({
  tenant_id: "tenant-a",
  legal_entity_id: "company-a",
});

test("an empty registry truthfully reports that future providers are unavailable", () => {
  const registry = createExternalReadProviderRegistry();

  assert.equal(registry.provider_count, 0);
  assert.deepEqual(
    registry.inspect({
      provider_id: "future-bank",
      capability: "bank.transactions.read",
    }),
    {
      provider_id: "future-bank",
      state: "provider_unavailable",
      safe_error_code: "EXTERNAL_READ_PROVIDER_UNAVAILABLE",
      ready: false,
    },
  );
});

test("a future adapter can be added without passing credential material through the registry", async () => {
  let received;
  const registry = createExternalReadProviderRegistry({
    providers: [{
      provider_id: "future-bank",
      adapter_version: "0.1.0",
      capabilities: ["bank.transactions.read"],
      consent_required: true,
      async read(input) {
        received = input;
        return {
          items: [{ external_transaction_ref: "transaction:001", amount: 1000 }],
          item_count: 1,
          next_checkpoint_ref: "ProviderCheckpoint:future-bank/002",
          provider_receipt_ref: "ProviderReceipt:future-bank/001",
          observed_at: "2026-09-03T10:00:00.000Z",
        };
      },
    }],
  });

  const result = await registry.read({
    connection: connection(),
    scope: authorityScope,
    capability: "bank.transactions.read",
    checkpoint_ref: "ProviderCheckpoint:future-bank/001",
  });

  assert.deepEqual(received, {
    tenant_id: "tenant-a",
    legal_entity_id: "company-a",
    connection_id: "connection-a",
    credential_ref: "aws-secrets-manager:lawos/tenant-a/future-bank",
    capability: "bank.transactions.read",
    checkpoint_ref: "ProviderCheckpoint:future-bank/001",
  });
  assert.equal(result.item_count, 1);
  assert.equal(result.tenant_id, "tenant-a");
  assert.equal(result.legal_entity_id, "company-a");
  assert.equal(result.next_checkpoint_ref, "ProviderCheckpoint:future-bank/002");
});

test("configuration and consent gates fail closed before an adapter is called", async () => {
  let calls = 0;
  const registry = createExternalReadProviderRegistry({
    providers: [{
      provider_id: "future-bank",
      adapter_version: "0.1.0",
      capabilities: ["bank.transactions.read"],
      async read() {
        calls += 1;
        return {};
      },
    }],
  });

  await assert.rejects(
    registry.read({
      connection: connection({ consent_state: "pending" }),
      scope: authorityScope,
      capability: "bank.transactions.read",
    }),
    (error) => error.safe_error_code === "EXTERNAL_READ_PROVIDER_CONSENT_REQUIRED",
  );
  await assert.rejects(
    registry.read({
      connection: connection({ state: "disabled" }),
      scope: authorityScope,
      capability: "bank.transactions.read",
    }),
    (error) => error.safe_error_code === "EXTERNAL_READ_PROVIDER_DISABLED",
  );
  await assert.rejects(
    registry.read({
      connection: connection(),
      scope: authorityScope,
      capability: "payments.execute",
    }),
    (error) => error.safe_error_code === "EXTERNAL_READ_CAPABILITY_UNAVAILABLE",
  );
  assert.equal(calls, 0);
});

test("the server authority scope must exactly match the connection tenant and legal entity", async () => {
  let calls = 0;
  const registry = createExternalReadProviderRegistry({
    providers: [{
      provider_id: "future-bank",
      adapter_version: "0.1.0",
      capabilities: ["bank.transactions.read"],
      async read() {
        calls += 1;
        return {};
      },
    }],
  });

  for (const scope of [
    undefined,
    { ...authorityScope, tenant_id: "tenant-b" },
    { ...authorityScope, legal_entity_id: "company-b" },
  ]) {
    await assert.rejects(
      registry.read({
        connection: connection(),
        scope,
        capability: "bank.transactions.read",
      }),
      (error) => [
        "EXTERNAL_READ_PROVIDER_SCOPE_REQUIRED",
        "EXTERNAL_READ_PROVIDER_SCOPE_MISMATCH",
      ].includes(error.safe_error_code),
    );
  }
  assert.equal(calls, 0);
});

test("connections reject raw keys and only read capabilities can be registered", () => {
  assert.throws(
    () => normalizeExternalReadConnection(connection({ credential_ref: "plain-api-key" })),
    /opaque AWS Secrets Manager reference/,
  );
  assert.throws(
    () => createExternalReadProviderRegistry({
      providers: [{
        provider_id: "future-bank",
        adapter_version: "0.1.0",
        capabilities: ["payments.execute"],
        read() {},
      }],
    }),
    /capability is invalid/,
  );
});

test("provider results require opaque receipts and exact item counts", async () => {
  const registry = createExternalReadProviderRegistry({
    providers: [{
      provider_id: "future-bank",
      adapter_version: "0.1.0",
      capabilities: ["bank.transactions.read"],
      async read() {
        return {
          items: [],
          item_count: 1,
          provider_receipt_ref: "ProviderReceipt:future-bank/001",
          observed_at: "2026-09-03T10:00:00.000Z",
        };
      },
    }],
  });

  await assert.rejects(
    registry.read({
      connection: connection(),
      scope: authorityScope,
      capability: "bank.transactions.read",
    }),
    (error) => error.safe_error_code === "EXTERNAL_READ_PROVIDER_RESPONSE_INVALID",
  );
});
