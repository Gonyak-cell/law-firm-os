import assert from "node:assert/strict";
import test from "node:test";

import {
  connectExternalReadProvider,
  disableExternalReadConnection,
  fetchExternalReadFirstSync,
  fetchExternalReadLegalEntities,
  fetchExternalReadLatestSync,
  fetchExternalReadProviders,
  reconnectExternalReadConnection,
  repairExternalReadConnection,
  revokeExternalReadConnection,
  rotateExternalReadConnection,
  syncExternalReadConnection
} from "../src/data/apiClient.js";

function response(body, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json" }
  });
}

const safety = Object.freeze({
  credential_material_included: false,
  production_ready_claim: false
});

test("external read web adapters complete provider discovery, key submit, and first-sync readback", async () => {
  const originalFetch = globalThis.fetch;
  const calls = [];
  globalThis.fetch = async (input, init = {}) => {
    calls.push({ input: String(input), init });
    if (String(input) === "/api/external-read/providers") {
      return response({
        ...safety,
        request_id: "request:list",
        outcome: "ok",
        provider_endpoint_included: false,
        api_key_onboarding_available: true,
        provider_count: 1,
        items: [{
          provider_id: "synthetic.bank",
          display_name: "Synthetic Bank",
          adapter_version: "1.0.0",
          auth_type: "api_key",
          credential_fields: ["api_key"],
          capabilities: ["transactions.read"],
          probe_capability: "transactions.read"
        }]
      });
    }
    if (String(input) === "/api/external-read/connections") {
      const submitted = JSON.parse(init.body);
      assert.equal(submitted.api_key, "secret-test-key");
      assert.equal(submitted.legal_entity_id, "entity-1");
      assert.equal(submitted.provider_id, "synthetic.bank");
      return response({
        ...safety,
        raw_provider_payload_included: false,
        request_id: "request:connect",
        outcome: "connected",
        connection: {
          connection_id: "connection-1",
          state: "ready",
          credential_configured: true,
          credential_material_included: false,
          raw_provider_payload_included: false,
          first_sync: { item_count: 1, sync_receipt_ref: "SyncReceipt:1" }
        }
      }, 201);
    }
    return response({
      ...safety,
      raw_provider_payload_included: false,
      request_id: "request:readback",
      outcome: "ok",
      snapshot: {
        item_count: 1,
        items: [{ transaction_id: "transaction-1" }],
        credential_material_included: false,
        raw_provider_payload_included: false,
        sync_receipt_ref: "SyncReceipt:1"
      }
    });
  };
  try {
    const providers = await fetchExternalReadProviders();
    assert.equal(providers.kind, "data");
    assert.equal(providers.providerCount, 1);

    const connected = await connectExternalReadProvider({
      legalEntityId: "entity-1",
      providerId: "synthetic.bank",
      apiKey: "secret-test-key",
      idempotencyKey: "idem-1"
    });
    assert.equal(connected.kind, "data");
    assert.equal(connected.connection.connection_id, "connection-1");

    const readback = await fetchExternalReadFirstSync({
      connectionId: connected.connection.connection_id,
      legalEntityId: "entity-1"
    });
    assert.equal(readback.kind, "data");
    assert.equal(readback.snapshot.item_count, 1);
    assert.match(calls[2].input, /\/first-sync\?legal_entity_id=entity-1$/);
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("external read web adapter returns only server-authoritative legal entity identifiers", async () => {
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async (input) => {
    assert.equal(String(input), "/api/external-read/legal-entities");
    return response({
      ...safety,
      raw_provider_payload_included: false,
      request_id: "request:legal-entities",
      outcome: "ok",
      legal_entity_count: 2,
      items: [
        { legal_entity_id: "entity-1" },
        { legal_entity_id: "entity-2" }
      ]
    });
  };
  try {
    const result = await fetchExternalReadLegalEntities();
    assert.equal(result.kind, "data");
    assert.deepEqual(result.legalEntities, ["entity-1", "entity-2"]);
    assert.equal(result.legalEntityCount, 2);
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("external read web adapters reject secret-bearing or malformed responses", async () => {
  const originalFetch = globalThis.fetch;
  try {
    globalThis.fetch = async () => response({
      ...safety,
      request_id: "request:unsafe",
      outcome: "ok",
      provider_endpoint_included: false,
      api_key_onboarding_available: true,
      provider_count: 0,
      items: [],
      api_key: "must-not-pass"
    });
    assert.equal((await fetchExternalReadProviders()).kind, "error");

    globalThis.fetch = async () => response({
      ...safety,
      request_id: "request:nested-unsafe",
      outcome: "ok",
      provider_endpoint_included: false,
      api_key_onboarding_available: true,
      provider_count: 1,
      items: [{ provider_id: "synthetic.bank", credential_ref: "aws-secrets-manager:must-not-pass" }]
    });
    assert.equal((await fetchExternalReadProviders()).kind, "error");

    globalThis.fetch = async () => response({
      ...safety,
      request_id: "request:denied",
      outcome: "blocked",
      items: [],
      safe_error_codes: ["EXTERNAL_READ_PERMISSION_DENIED"]
    }, 403);
    const denied = await connectExternalReadProvider({
      legalEntityId: "entity-1",
      providerId: "synthetic.bank",
      apiKey: "secret-test-key",
      idempotencyKey: "idem-2"
    });
    assert.equal(denied.kind, "denied");
    assert.deepEqual(denied.safeErrorCodes, ["EXTERNAL_READ_PERMISSION_DENIED"]);
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("external read web adapters expose only safe lifecycle and latest-sync receipts", async () => {
  const originalFetch = globalThis.fetch;
  const calls = [];
  globalThis.fetch = async (input, init = {}) => {
    const path = String(input);
    calls.push({ path, init });
    if (path.includes("/latest-sync?")) {
      return response({
        ...safety,
        raw_provider_payload_included: false,
        request_id: "request:latest",
        outcome: "ok",
        snapshot: {
          item_count: 1,
          items: [{ external_id: "safe-1" }],
          sync_receipt_ref: "SyncReceipt:latest",
          credential_material_included: false,
          raw_provider_payload_included: false
        }
      });
    }
    const action = path.split("/").at(-1);
    const submitted = JSON.parse(init.body);
    if (action === "rotate") assert.equal(submitted.api_key, "rotated-key-never-return");
    return response({
      ...safety,
      raw_provider_payload_included: false,
      request_id: `request:${action}`,
      outcome: action === "sync" || action === "reconnect"
        ? "synchronized"
        : action === "rotate" ? "rotated" : `${action}d`,
      connection: {
        connection_id: "connection-1",
        state: action === "disable" ? "disabled" : action === "revoke" ? "revoked" : "ready",
        credential_configured: action !== "revoke",
        credential_material_included: false,
        raw_provider_payload_included: false
      },
      operation: {
        operation_id: `operation-${action}`,
        kind: action,
        state: "completed",
        result: { outcome: action },
        credential_material_included: false,
        raw_provider_payload_included: false
      }
    });
  };
  try {
    const base = {
      connectionId: "connection-1",
      legalEntityId: "entity-1",
      idempotencyKey: "lifecycle-001"
    };
    const results = await Promise.all([
      syncExternalReadConnection(base),
      disableExternalReadConnection(base),
      reconnectExternalReadConnection(base),
      rotateExternalReadConnection({ ...base, apiKey: "rotated-key-never-return" }),
      revokeExternalReadConnection(base),
      repairExternalReadConnection(base)
    ]);
    assert.equal(results.every(({ kind }) => kind === "data"), true);
    assert.deepEqual(results.map(({ operation }) => operation.kind), [
      "sync", "disable", "reconnect", "rotate", "revoke", "repair"
    ]);
    const latest = await fetchExternalReadLatestSync(base);
    assert.equal(latest.kind, "data");
    assert.equal(latest.snapshot.sync_receipt_ref, "SyncReceipt:latest");
    assert.equal(JSON.stringify({ results, latest }).includes("rotated-key-never-return"), false);
    assert.equal(calls.every(({ path }) => path.includes("connection-1")), true);
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("external read lifecycle adapters reject a secret reference anywhere in the response", async () => {
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async () => response({
    ...safety,
    raw_provider_payload_included: false,
    request_id: "request:unsafe-lifecycle",
    outcome: "synchronized",
    connection: {
      connection_id: "connection-1",
      state: "ready",
      credential_ref: "aws-secrets-manager:must-not-pass",
      credential_material_included: false,
      raw_provider_payload_included: false
    },
    operation: {
      operation_id: "operation-unsafe",
      kind: "sync",
      state: "completed",
      credential_material_included: false,
      raw_provider_payload_included: false
    }
  });
  try {
    const result = await syncExternalReadConnection({
      connectionId: "connection-1",
      legalEntityId: "entity-1",
      idempotencyKey: "unsafe-lifecycle-001"
    });
    assert.equal(result.kind, "error");
  } finally {
    globalThis.fetch = originalFetch;
  }
});
