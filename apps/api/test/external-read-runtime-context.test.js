import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import test from "node:test";
import {
  EXTERNAL_READ_PROVIDER_PACK_SCHEMA_VERSION,
  createTestExternalReadOnboardingRepository,
} from "../../../packages/integrations-core/src/index.js";
import {
  createExternalReadRuntime,
  createFailClosedExternalReadRuntime,
  handleExternalReadApiRequest,
  runExternalReadScheduledSync,
} from "../src/external-read-runtime-context.js";

const TENANT = "tenant-synthetic";
const ENTITY = "company-synthetic";
const NOW = "2026-09-03T14:00:00.000Z";
const CONTEXT = Object.freeze({
  principal: Object.freeze({ tenant_id: TENANT, user_id: "admin-synthetic" }),
  rules: Object.freeze([Object.freeze({
    id: "allow-external-read-admin",
    effect: "allow",
    action: "*",
  })]),
  object_acl: Object.freeze([]),
});
const LEGAL_ENTITY_DIRECTORY = Object.freeze({
  listEmploymentProfiles({ tenant_id }) {
    return tenant_id === TENANT
      ? [{ tenant_id: TENANT, legal_entity_id: ENTITY }]
      : [];
  },
});

function pack() {
  return {
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
      field_map: { external_id: ["id"], amount: ["amount"] },
      required_fields: ["external_id", "amount"],
    }],
  };
}

function runtime() {
  const secrets = new Map();
  const ref = (scope) => `aws-secrets-manager:test/${createHash("sha256")
    .update(JSON.stringify({
      tenant_id: scope.tenant_id,
      legal_entity_id: scope.legal_entity_id,
      connection_id: scope.connection_id,
      provider_id: scope.provider_id,
    }))
    .digest("hex")}/${scope.credential_generation ?? "initial"}`;
  const vault = {
    operational: false,
    referenceForConnection: ref,
    async storeApiKey(input) {
      const credentialRef = ref(input);
      secrets.set(credentialRef, { ...input });
      return credentialRef;
    },
    async resolveApiKey(input) {
      return { api_key: secrets.get(input.credential_ref).api_key };
    },
    async revokeApiKey(input) {
      secrets.delete(input.credential_ref);
      return { credential_ref: input.credential_ref };
    },
  };
  let id = 0;
  return createExternalReadRuntime({
    packs: [pack()],
    credentialVault: vault,
    repository: createTestExternalReadOnboardingRepository(),
    idFactory: () => `http-synthetic-${++id}`,
    clock: () => NOW,
    fetchImpl: async (_url, options) => {
      const key = options.headers["X-Api-Key"];
      assert.ok(["http-synthetic-key", "http-rotated-key"].includes(key));
      return new Response(JSON.stringify({
        transactions: [{
          id: key === "http-synthetic-key" ? "transaction-http-001" : "transaction-http-rotated",
          amount: key === "http-synthetic-key" ? 9900 : 12300,
        }],
      }), { status: 200, headers: { "content-type": "application/json" } });
    },
  });
}

test("zero providers is an explicit fail-closed API state", async () => {
  const empty = createFailClosedExternalReadRuntime();
  const providers = await handleExternalReadApiRequest({
    pathname: "/api/external-read/providers",
    method: "GET",
    context: CONTEXT,
    requestId: "request-empty",
    runtime: empty,
  });
  assert.equal(providers.status, 200);
  assert.equal(providers.body.provider_count, 0);
  assert.equal(providers.body.api_key_onboarding_available, false);

  const create = await handleExternalReadApiRequest({
    pathname: "/api/external-read/connections",
    method: "POST",
    body: { tenant_id: TENANT },
    context: CONTEXT,
    requestId: "request-empty-create",
    runtime: empty,
  });
  assert.equal(create.status, 409);
  assert.deepEqual(create.body.safe_error_codes, ["EXTERNAL_READ_PROVIDER_UNAVAILABLE"]);
});

test("authenticated admin API performs key-only onboarding then returns status and first-sync data", async () => {
  const active = runtime();
  const providers = await handleExternalReadApiRequest({
    pathname: "/api/external-read/providers",
    method: "GET",
    context: CONTEXT,
    requestId: "request-providers",
    runtime: active,
  });
  assert.equal(providers.body.provider_count, 1);
  assert.equal(JSON.stringify(providers.body).includes("future-bank.invalid"), false);

  const legalEntities = await handleExternalReadApiRequest({
    pathname: "/api/external-read/legal-entities",
    method: "GET",
    context: CONTEXT,
    requestId: "request-legal-entities",
    runtime: active,
    legalEntityDirectory: LEGAL_ENTITY_DIRECTORY,
  });
  assert.equal(legalEntities.status, 200);
  assert.deepEqual(legalEntities.body.items, [{ legal_entity_id: ENTITY }]);
  assert.equal(legalEntities.body.legal_entity_count, 1);

  const created = await handleExternalReadApiRequest({
    pathname: "/api/external-read/connections",
    method: "POST",
    body: {
      tenant_id: TENANT,
      legal_entity_id: ENTITY,
      provider_id: "future-bank",
      idempotency_key: "http-connect-001",
      api_key: "http-synthetic-key",
    },
    context: CONTEXT,
    requestId: "request-create",
    runtime: active,
  });
  assert.equal(created.status, 201);
  assert.equal(created.body.connection.state, "ready");
  assert.equal(JSON.stringify(created.body).includes("http-synthetic-key"), false);
  const connectionId = created.body.connection.connection_id;

  const status = await handleExternalReadApiRequest({
    pathname: `/api/external-read/connections/${encodeURIComponent(connectionId)}`,
    method: "GET",
    query: { tenant_id: TENANT, legal_entity_id: ENTITY },
    context: CONTEXT,
    requestId: "request-status",
    runtime: active,
  });
  assert.equal(status.status, 200);
  assert.equal(status.body.connection.connection_id, connectionId);

  const data = await handleExternalReadApiRequest({
    pathname: `/api/external-read/connections/${encodeURIComponent(connectionId)}/first-sync`,
    method: "GET",
    query: { tenant_id: TENANT, legal_entity_id: ENTITY },
    context: CONTEXT,
    requestId: "request-data",
    runtime: active,
  });
  assert.equal(data.status, 200);
  assert.deepEqual(data.body.snapshot.items, [{ external_id: "transaction-http-001", amount: 9900 }]);
  assert.equal(data.body.raw_provider_payload_included, false);
});

test("operational onboarding rejects a legal entity absent from the tenant directory before provider access", async () => {
  const active = Object.freeze({ ...runtime(), operational: true });
  const result = await handleExternalReadApiRequest({
    pathname: "/api/external-read/connections",
    method: "POST",
    body: {
      tenant_id: TENANT,
      legal_entity_id: "company-unknown",
      provider_id: "future-bank",
      idempotency_key: "http-unknown-entity-001",
      api_key: "must-not-reach-provider",
    },
    context: CONTEXT,
    requestId: "request-unknown-entity",
    runtime: active,
    legalEntityDirectory: LEGAL_ENTITY_DIRECTORY,
  });
  assert.equal(result.status, 404);
  assert.deepEqual(result.body.safe_error_codes, ["EXTERNAL_READ_LEGAL_ENTITY_NOT_FOUND"]);
});

test("the HTTP boundary denies missing permission and cross-tenant key submission before onboarding", async () => {
  const active = runtime();
  const noPermission = await handleExternalReadApiRequest({
    pathname: "/api/external-read/connections",
    method: "POST",
    body: { tenant_id: TENANT, api_key: "must-not-store" },
    context: { ...CONTEXT, rules: [] },
    requestId: "request-denied",
    runtime: active,
  });
  assert.equal(noPermission.status, 403);

  const crossTenant = await handleExternalReadApiRequest({
    pathname: "/api/external-read/connections",
    method: "POST",
    body: { tenant_id: "tenant-other", api_key: "must-not-store" },
    context: CONTEXT,
    requestId: "request-cross-tenant",
    runtime: active,
  });
  assert.equal(crossTenant.status, 403);
  assert.equal(JSON.stringify(crossTenant.body).includes("must-not-store"), false);
});

test("authenticated lifecycle routes sync, disable, reconnect, rotate, read latest, and revoke", async () => {
  const active = runtime();
  const created = await handleExternalReadApiRequest({
    pathname: "/api/external-read/connections",
    method: "POST",
    body: {
      tenant_id: TENANT,
      legal_entity_id: ENTITY,
      provider_id: "future-bank",
      idempotency_key: "http-lifecycle-connect-001",
      api_key: "http-synthetic-key",
    },
    context: CONTEXT,
    requestId: "request-lifecycle-create",
    runtime: active,
  });
  const connectionId = created.body.connection.connection_id;
  const path = (suffix) => `/api/external-read/connections/${encodeURIComponent(connectionId)}/${suffix}`;
  const invoke = (suffix, body) => handleExternalReadApiRequest({
    pathname: path(suffix),
    method: "POST",
    body: { tenant_id: TENANT, legal_entity_id: ENTITY, ...body },
    context: CONTEXT,
    requestId: `request-${suffix}`,
    runtime: active,
  });

  const synced = await invoke("sync", { idempotency_key: "http-sync-001" });
  const disabled = await invoke("disable", { idempotency_key: "http-disable-001" });
  const reconnected = await invoke("reconnect", { idempotency_key: "http-reconnect-001" });
  const rotated = await invoke("rotate", {
    idempotency_key: "http-rotate-001",
    api_key: "http-rotated-key",
  });
  const latest = await handleExternalReadApiRequest({
    pathname: path("latest-sync"),
    method: "GET",
    query: { tenant_id: TENANT, legal_entity_id: ENTITY },
    context: CONTEXT,
    requestId: "request-latest-sync",
    runtime: active,
  });
  const revoked = await invoke("revoke", { idempotency_key: "http-revoke-001" });

  assert.equal(synced.body.outcome, "synchronized");
  assert.equal(disabled.body.connection.state, "disabled");
  assert.equal(reconnected.body.connection.state, "ready");
  assert.equal(rotated.body.outcome, "rotated");
  assert.equal(latest.status, 200);
  assert.deepEqual(latest.body.snapshot.items, [{ external_id: "transaction-http-rotated", amount: 12300 }]);
  assert.equal(revoked.body.connection.state, "revoked");
  assert.equal(JSON.stringify({ synced, disabled, reconnected, rotated, latest, revoked }).includes("http-rotated-key"), false);
});

test("scheduled sync uses a deterministic window idempotency key and returns safe per-target receipts", async () => {
  const active = runtime();
  const connected = await active.service.onboardApiKey({
    tenant_id: TENANT,
    legal_entity_id: ENTITY,
    provider_id: "future-bank",
    actor_id: "admin-synthetic",
    idempotency_key: "scheduled-connect-001",
    api_key: "http-synthetic-key",
  });
  const input = {
    service: active.service,
    schedule_window: "2026-09-03T14",
    targets: [{ tenant_id: TENANT, legal_entity_id: ENTITY, connection_id: connected.connection_id }],
  };
  const first = await runExternalReadScheduledSync(input);
  const replay = await runExternalReadScheduledSync(input);
  assert.equal(first.synchronized_count, 1);
  assert.equal(first.failed_count, 0);
  assert.equal(first.receipts[0].replayed, false);
  assert.equal(replay.receipts[0].replayed, true);
  assert.equal(replay.receipts[0].operation_id, first.receipts[0].operation_id);
  assert.equal(JSON.stringify(replay).includes("http-synthetic-key"), false);
});
