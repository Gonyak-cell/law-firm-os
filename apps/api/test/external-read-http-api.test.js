import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import test from "node:test";
import {
  EXTERNAL_READ_PROVIDER_PACK_SCHEMA_VERSION,
  createTestExternalReadOnboardingRepository,
} from "../../../packages/integrations-core/src/index.js";
import { createExternalReadRuntime } from "../src/external-read-runtime-context.js";
import {
  highestPrivilegeRegisteredAccount,
  MATTER_VAULT_REGISTERED_TENANT_ID,
} from "../src/matter-vault-account-registry.js";
import { PERMISSION_CONTEXT_HEADER } from "../src/permission-gate.js";
import { startApiServer } from "../src/server.js";
import { apiSessionHeaders } from "./helpers/session.js";

const ACCOUNT = highestPrivilegeRegisteredAccount();
assert.ok(ACCOUNT);
const TENANT = MATTER_VAULT_REGISTERED_TENANT_ID;
const KEY = "http-server-synthetic-key";
const ROTATED_KEY = "http-server-synthetic-rotated-key";

function runtime() {
  const secrets = new Map();
  const referenceForConnection = (scope) => `aws-secrets-manager:test/${createHash("sha256")
    .update(JSON.stringify({ ...scope, credential_generation: scope.credential_generation ?? "initial" }))
    .digest("hex")}`;
  const credentialVault = {
    operational: false,
    referenceForConnection,
    async storeApiKey(input) {
      const ref = referenceForConnection({
        tenant_id: input.tenant_id,
        legal_entity_id: input.legal_entity_id,
        connection_id: input.connection_id,
        provider_id: input.provider_id,
        credential_generation: input.credential_generation,
      });
      secrets.set(ref, input.api_key);
      return ref;
    },
    async resolveApiKey(input) {
      return { api_key: secrets.get(input.credential_ref) };
    },
    async revokeApiKey(input) {
      secrets.delete(input.credential_ref);
      return { credential_ref: input.credential_ref };
    },
  };
  return createExternalReadRuntime({
    packs: [{
      schema_version: EXTERNAL_READ_PROVIDER_PACK_SCHEMA_VERSION,
      provider_id: "future-bank",
      display_name: "Future Bank",
      adapter_version: "1.0.0",
      base_url: "https://future-bank.invalid",
      auth: { type: "api_key", placement: "header", header_name: "X-Api-Key" },
      probe_capability: "bank.transactions.read",
      capabilities: [{
        capability: "bank.transactions.read",
        path: "/v1/transactions",
        items_path: ["transactions"],
        field_map: { external_id: ["id"] },
        required_fields: ["external_id"],
      }],
    }],
    credentialVault,
    repository: createTestExternalReadOnboardingRepository(),
    idFactory: (() => {
      let id = 0;
      return () => `server-synthetic-${++id}`;
    })(),
    clock: () => "2026-09-03T15:00:00.000Z",
    fetchImpl: async (_url, options) => {
      assert.ok([KEY, ROTATED_KEY].includes(options.headers["X-Api-Key"]));
      return new Response(JSON.stringify({
        transactions: [{
          id: options.headers["X-Api-Key"] === ROTATED_KEY
            ? "server-transaction-rotated-002"
            : "server-transaction-001",
        }],
      }), {
        status: 200,
        headers: { "content-type": "application/json" },
      });
    },
  });
}

test("the real HTTP server registers onboarding, readback, and the complete key lifecycle", async (t) => {
  const started = await startApiServer({ port: 0, externalReadRuntime: runtime() });
  t.after(() => new Promise((resolve) => started.server.close(resolve)));
  const baseUrl = `http://${started.host}:${started.port}`;
  const authentication = await apiSessionHeaders(baseUrl, ACCOUNT);
  const permission = JSON.stringify({
    principal: {
      tenant_id: TENANT,
      user_id: ACCOUNT.user_id,
      role_ids: ACCOUNT.role_ids,
    },
    rules: [{ id: "external-read-test", effect: "allow", action: "*" }],
    object_acl: [],
  });
  const headers = {
    ...authentication,
    [PERMISSION_CONTEXT_HEADER]: permission,
    "content-type": "application/json",
  };

  const health = await fetch(`${baseUrl}/api/health`).then((response) => response.json());
  assert.equal(health.external_read.provider_count, 1);
  assert.equal(health.external_read.api_key_onboarding_available, true);

  const providersResponse = await fetch(`${baseUrl}/api/external-read/providers`, { headers });
  const providers = await providersResponse.json();
  assert.equal(providersResponse.status, 200, JSON.stringify(providers));
  assert.equal(providers.provider_count, 1);
  assert.equal(JSON.stringify(providers).includes("future-bank.invalid"), false);

  const createResponse = await fetch(`${baseUrl}/api/external-read/connections`, {
    method: "POST",
    headers,
    body: JSON.stringify({
      tenant_id: TENANT,
      legal_entity_id: "company-http-synthetic",
      provider_id: "future-bank",
      idempotency_key: "http-server-connect-001",
      api_key: KEY,
    }),
  });
  const created = await createResponse.json();
  assert.equal(createResponse.status, 201);
  assert.equal(created.connection.state, "ready");
  assert.equal(JSON.stringify(created).includes(KEY), false);

  const wrongEntityConnectionResponse = await fetch(
    `${baseUrl}/api/external-read/connections/${encodeURIComponent(created.connection.connection_id)}?legal_entity_id=company-http-other`,
    { headers },
  );
  const wrongEntityConnection = await wrongEntityConnectionResponse.json();
  assert.equal(wrongEntityConnectionResponse.status, 404);
  assert.deepEqual(wrongEntityConnection.safe_error_codes, ["EXTERNAL_READ_CONNECTION_NOT_FOUND"]);

  const connectionResponse = await fetch(
    `${baseUrl}/api/external-read/connections/${encodeURIComponent(created.connection.connection_id)}?legal_entity_id=company-http-synthetic`,
    { headers },
  );
  const connection = await connectionResponse.json();
  assert.equal(connectionResponse.status, 200);
  assert.equal(connection.connection.legal_entity_id, "company-http-synthetic");

  const firstSyncResponse = await fetch(
    `${baseUrl}/api/external-read/connections/${encodeURIComponent(created.connection.connection_id)}/first-sync?tenant_id=${encodeURIComponent(TENANT)}&legal_entity_id=company-http-synthetic`,
    { headers },
  );
  const firstSync = await firstSyncResponse.json();
  assert.equal(firstSyncResponse.status, 200);
  assert.deepEqual(firstSync.snapshot.items, [{ external_id: "server-transaction-001" }]);
  assert.equal(JSON.stringify(firstSync).includes(KEY), false);

  const connectionId = encodeURIComponent(created.connection.connection_id);
  const lifecycle = async (action, idempotencyKey, extra = {}) => {
    const response = await fetch(`${baseUrl}/api/external-read/connections/${connectionId}/${action}`, {
      method: "POST",
      headers,
      body: JSON.stringify({
        tenant_id: TENANT,
        legal_entity_id: "company-http-synthetic",
        idempotency_key: idempotencyKey,
        ...extra,
      }),
    });
    const body = await response.json();
    assert.equal(JSON.stringify(body).includes(KEY), false);
    assert.equal(JSON.stringify(body).includes(ROTATED_KEY), false);
    return { response, body };
  };

  const synced = await lifecycle("sync", "http-server-sync-001");
  assert.equal(synced.response.status, 200);
  assert.equal(synced.body.connection.state, "ready");
  assert.equal(synced.body.operation.result.item_count, 1);

  const syncReplay = await lifecycle("sync", "http-server-sync-001");
  assert.equal(syncReplay.response.status, 200);
  assert.equal(syncReplay.body.operation.replayed, true);

  const disabled = await lifecycle("disable", "http-server-disable-001", { reason_code: "ADMIN_DISABLED" });
  assert.equal(disabled.response.status, 200);
  assert.equal(disabled.body.connection.state, "disabled");

  const reconnected = await lifecycle("reconnect", "http-server-reconnect-001");
  assert.equal(reconnected.response.status, 200);
  assert.equal(reconnected.body.connection.state, "ready");

  const rotated = await lifecycle("rotate", "http-server-rotate-001", { api_key: ROTATED_KEY });
  assert.equal(rotated.response.status, 200);
  assert.equal(rotated.body.connection.state, "ready");
  assert.equal(rotated.body.operation.result.outcome, "rotated");

  const latestResponse = await fetch(
    `${baseUrl}/api/external-read/connections/${connectionId}/latest-sync?tenant_id=${encodeURIComponent(TENANT)}&legal_entity_id=company-http-synthetic`,
    { headers },
  );
  const latest = await latestResponse.json();
  assert.equal(latestResponse.status, 200);
  assert.deepEqual(latest.snapshot.items, [{ external_id: "server-transaction-rotated-002" }]);
  assert.equal(JSON.stringify(latest).includes(ROTATED_KEY), false);

  const revoked = await lifecycle("revoke", "http-server-revoke-001", { reason_code: "ADMIN_REVOKED" });
  assert.equal(revoked.response.status, 200);
  assert.equal(revoked.body.connection.state, "revoked");
  assert.equal(revoked.body.connection.credential_configured, false);

  const rejectedSync = await lifecycle("sync", "http-server-sync-after-revoke-001");
  assert.equal(rejectedSync.response.status, 409);
  assert.deepEqual(rejectedSync.body.safe_error_codes, ["EXTERNAL_READ_CONNECTION_NOT_AVAILABLE"]);
});

test("the real HTTP route rejects an unauthenticated API key before touching runtime", async (t) => {
  const started = await startApiServer({ port: 0, externalReadRuntime: runtime() });
  t.after(() => new Promise((resolve) => started.server.close(resolve)));
  const response = await fetch(`http://${started.host}:${started.port}/api/external-read/connections`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ api_key: "must-never-store" }),
  });
  const body = await response.json();
  assert.equal(response.status, 401);
  assert.equal(JSON.stringify(body).includes("must-never-store"), false);
});
