import assert from "node:assert/strict";
import test from "node:test";
import {
  EXTERNAL_READ_PROVIDER_PACK_SCHEMA_VERSION,
  createExternalReadProviderFromPack,
  createExternalReadProviderPackCatalog,
  createExternalReadProviderRegistry,
  normalizeExternalReadProviderPack,
} from "../src/index.js";

function syntheticPack(overrides = {}) {
  return {
    schema_version: EXTERNAL_READ_PROVIDER_PACK_SCHEMA_VERSION,
    provider_id: "synthetic-bank",
    display_name: "Synthetic Bank",
    adapter_version: "1.0.0",
    base_url: "https://api.synthetic-bank.invalid",
    auth: {
      type: "api_key",
      placement: "header",
      header_name: "x-api-key",
      value_prefix: "Key ",
    },
    probe_capability: "bank.transactions.read",
    capabilities: [{
      capability: "bank.transactions.read",
      path: "/v1/transactions",
      items_path: ["data", "transactions"],
      field_map: {
        external_id: ["id"],
        amount_minor: ["amount_minor"],
        currency: ["currency"],
      },
      required_fields: ["external_id", "amount_minor", "currency"],
      max_items: 2,
    }],
    ...overrides,
  };
}

const scope = Object.freeze({
  tenant_id: "tenant-a",
  legal_entity_id: "company-a",
});

test("the provider catalog exposes onboarding metadata but no endpoint or credential detail", () => {
  const catalog = createExternalReadProviderPackCatalog({ packs: [syntheticPack()] });

  assert.equal(catalog.provider_count, 1);
  assert.deepEqual(catalog.list(), [{
    provider_id: "synthetic-bank",
    display_name: "Synthetic Bank",
    adapter_version: "1.0.0",
    auth_type: "api_key",
    credential_fields: ["api_key"],
    capabilities: ["bank.transactions.read"],
    probe_capability: "bank.transactions.read",
  }]);
  assert.equal(JSON.stringify(catalog.list()).includes("base_url"), false);
  assert.equal(catalog.get("missing-provider"), null);
  assert.equal(catalog.providers({
    resolve_credential: async () => ({ api_key: "synthetic" }),
    fetch_impl: async () => new Response('{"data":{"transactions":[]}}', {
      headers: { "content-type": "application/json" },
    }),
  }).length, 1);
});

const connection = Object.freeze({
  schema_version: "law-firm-os.external-read-provider.v0.1",
  tenant_id: scope.tenant_id,
  legal_entity_id: scope.legal_entity_id,
  connection_id: "connection-a",
  provider_id: "synthetic-bank",
  state: "ready",
  consent_state: "not_required",
  credential_ref: "aws-secrets-manager:lawos/tenant-a/company-a/synthetic-bank",
});

test("an approved synthetic provider pack completes an API-key read through the registry", async () => {
  let request;
  let credentialRequest;
  const provider = createExternalReadProviderFromPack(syntheticPack(), {
    clock: () => "2026-09-03T14:00:00.000Z",
    resolve_credential: async (input) => {
      credentialRequest = input;
      return { api_key: "not-a-real-key" };
    },
    fetch_impl: async (url, init) => {
      request = { url: String(url), init };
      return new Response(JSON.stringify({
        data: {
          transactions: [{
            id: "txn-1",
            amount_minor: 12500,
            currency: "KRW",
            ignored_provider_field: "not-mapped",
          }],
        },
      }), {
        status: 200,
        headers: { "content-type": "application/json" },
      });
    },
  });
  const registry = createExternalReadProviderRegistry({ providers: [provider] });

  const result = await registry.read({
    connection,
    scope,
    capability: "bank.transactions.read",
  });

  assert.deepEqual(credentialRequest, {
    ...scope,
    connection_id: "connection-a",
    provider_id: "synthetic-bank",
    credential_ref: connection.credential_ref,
    purpose: "external_read",
  });
  assert.equal(request.url, "https://api.synthetic-bank.invalid/v1/transactions");
  assert.equal(request.init.method, "GET");
  assert.equal(request.init.redirect, "error");
  assert.equal(request.init.headers["x-api-key"], "Key not-a-real-key");
  assert.deepEqual(result.items, [{
    external_id: "txn-1",
    amount_minor: 12500,
    currency: "KRW",
  }]);
  assert.equal(result.item_count, 1);
  assert.deepEqual(result.metrics, {
    page_count: 1,
    request_count: 1,
    retry_count: 0,
    response_byte_count: Buffer.byteLength(JSON.stringify({
      data: {
        transactions: [{
          id: "txn-1",
          amount_minor: 12500,
          currency: "KRW",
          ignored_provider_field: "not-mapped",
        }],
      },
    })),
    duplicate_item_count: 0,
  });
  assert.match(result.provider_receipt_ref, /^ProviderReceipt:synthetic-bank\/[a-f0-9]{64}$/u);
  assert.equal(result.observed_at, "2026-09-03T14:00:00.000Z");
});

test("pack v2 bounds cursor pagination, retries 429, deduplicates, and resumes only from an opaque checkpoint", async () => {
  const capability = {
    ...syntheticPack().capabilities[0],
    max_items: 5,
    pagination: {
      type: "cursor",
      request_query_param: "page_cursor",
      response_cursor_path: ["meta", "next_cursor"],
      max_pages: 3,
    },
    checkpoint: {
      request_query_param: "updated_after",
      response_cursor_path: ["meta", "sync_cursor"],
    },
    rate_limit: {
      max_retries: 1,
      retry_statuses: [429],
      base_delay_ms: 1,
      max_delay_ms: 1,
      honor_retry_after: true,
    },
  };
  const requests = [];
  const delays = [];
  let firstAttempt = true;
  const provider = createExternalReadProviderFromPack(syntheticPack({ capabilities: [capability] }), {
    clock: () => "2026-09-03T14:30:00.000Z",
    resolve_credential: async () => ({ api_key: "synthetic" }),
    sleep_impl: async (milliseconds) => { delays.push(milliseconds); },
    fetch_impl: async (input) => {
      const url = new URL(input);
      requests.push(url);
      if (firstAttempt) {
        firstAttempt = false;
        return new Response("", { status: 429, headers: { "retry-after": "999" } });
      }
      if (url.searchParams.get("updated_after") === "sync-200") {
        return new Response(JSON.stringify({
          data: { transactions: [{ id: "txn-4", amount_minor: 400, currency: "KRW" }] },
          meta: { next_cursor: null, sync_cursor: "sync-300" },
        }), { status: 200, headers: { "content-type": "application/json" } });
      }
      if (url.searchParams.get("page_cursor") === "page-2") {
        return new Response(JSON.stringify({
          data: { transactions: [
            { id: "txn-2", amount_minor: 200, currency: "KRW" },
            { id: "txn-3", amount_minor: 300, currency: "KRW" },
          ] },
          meta: { next_cursor: null, sync_cursor: "sync-200" },
        }), { status: 200, headers: { "content-type": "application/json" } });
      }
      return new Response(JSON.stringify({
        data: { transactions: [
          { id: "txn-1", amount_minor: 100, currency: "KRW" },
          { id: "txn-2", amount_minor: 200, currency: "KRW" },
        ] },
        meta: { next_cursor: "page-2", sync_cursor: "sync-100" },
      }), { status: 200, headers: { "content-type": "application/json" } });
    },
  });
  const registry = createExternalReadProviderRegistry({ providers: [provider] });

  const first = await registry.read({
    connection,
    scope,
    capability: "bank.transactions.read",
  });
  assert.deepEqual(first.items.map(({ external_id }) => external_id), ["txn-1", "txn-2", "txn-3"]);
  assert.equal(first.metrics.page_count, 2);
  assert.equal(first.metrics.request_count, 3);
  assert.equal(first.metrics.retry_count, 1);
  assert.equal(first.metrics.duplicate_item_count, 1);
  assert.ok(first.metrics.response_byte_count > 0);
  assert.deepEqual(delays, [1]);
  assert.match(first.next_checkpoint_ref, /^ProviderCheckpoint:[A-Za-z0-9_-]+$/u);
  assert.equal(first.next_checkpoint_ref.includes("sync-200"), false);
  assert.equal(requests[0].search, "");
  assert.equal(requests[1].search, "");
  assert.equal(requests[2].searchParams.get("page_cursor"), "page-2");

  const second = await registry.read({
    connection,
    scope,
    capability: "bank.transactions.read",
    checkpoint_ref: first.next_checkpoint_ref,
  });
  assert.deepEqual(second.items.map(({ external_id }) => external_id), ["txn-4"]);
  assert.equal(requests[3].searchParams.get("updated_after"), "sync-200");
  assert.equal(requests[3].searchParams.has("page_cursor"), false);
  assert.notEqual(second.next_checkpoint_ref, first.next_checkpoint_ref);
});

test("pack v2 rejects repeated pagination cursors and invalid checkpoint scope", async () => {
  const capability = {
    ...syntheticPack().capabilities[0],
    pagination: {
      type: "cursor",
      request_query_param: "page_cursor",
      response_cursor_path: ["meta", "next_cursor"],
      max_pages: 3,
    },
    checkpoint: {
      request_query_param: "updated_after",
      response_cursor_path: ["meta", "sync_cursor"],
    },
  };
  const provider = createExternalReadProviderFromPack(syntheticPack({ capabilities: [capability] }), {
    resolve_credential: async () => ({ api_key: "synthetic" }),
    fetch_impl: async () => new Response(JSON.stringify({
      data: { transactions: [] },
      meta: { next_cursor: "same-cursor", sync_cursor: "sync-1" },
    }), { status: 200, headers: { "content-type": "application/json" } }),
  });
  const context = {
    ...scope,
    connection_id: connection.connection_id,
    credential_ref: connection.credential_ref,
    capability: "bank.transactions.read",
  };
  await assert.rejects(
    provider.read(context),
    ({ safe_error_code }) => safe_error_code === "EXTERNAL_READ_PROVIDER_CURSOR_LOOP",
  );
  await assert.rejects(
    provider.read({ ...context, checkpoint_ref: "ProviderCheckpoint:not-canonical" }),
    ({ safe_error_code }) => safe_error_code === "EXTERNAL_READ_PROVIDER_CHECKPOINT_INVALID",
  );
});

test("provider packs reject arbitrary URLs, write methods, query credentials, and schema drift", () => {
  for (const base_url of [
    "http://api.example.com",
    "https://localhost",
    "https://127.0.0.1",
    "https://api.example.com:8443",
    "https://user:pass@api.example.com",
    "https://api.example.com/base",
  ]) {
    assert.throws(() => normalizeExternalReadProviderPack(syntheticPack({ base_url })));
  }
  assert.throws(() => normalizeExternalReadProviderPack(syntheticPack({
    auth: { type: "api_key", placement: "query", header_name: "x-api-key" },
  })), /only header API keys/u);
  assert.throws(() => normalizeExternalReadProviderPack(syntheticPack({
    capabilities: [{
      ...syntheticPack().capabilities[0],
      field_map: {
        ...syntheticPack().capabilities[0].field_map,
        access_token: ["token"],
      },
    }],
  })), /cannot map credential material/u);
  assert.throws(() => normalizeExternalReadProviderPack({
    ...syntheticPack(),
    method: "POST",
  }), /unsupported fields/u);
});

test("provider execution fails closed before leaking credentials or accepting hostile responses", async () => {
  let fetchCalls = 0;
  const credentialFailure = createExternalReadProviderFromPack(syntheticPack(), {
    resolve_credential: async () => ({ api_key: "bad\r\nheader" }),
    fetch_impl: async () => {
      fetchCalls += 1;
      throw new Error("must not execute");
    },
  });
  const credentialRegistry = createExternalReadProviderRegistry({ providers: [credentialFailure] });
  await assert.rejects(
    credentialRegistry.read({ connection, scope, capability: "bank.transactions.read" }),
    ({ safe_error_code, message }) => (
      safe_error_code === "EXTERNAL_READ_PROVIDER_FAILED"
      && message === "External provider read failed"
    ),
  );
  assert.equal(fetchCalls, 0);

  for (const response of [
    new Response("not-json", { status: 200, headers: { "content-type": "text/plain" } }),
    new Response(JSON.stringify({ data: { transactions: [{ id: "txn-1" }] } }), {
      status: 200,
      headers: { "content-type": "application/json" },
    }),
    new Response(JSON.stringify({ data: { transactions: [{ id: "1" }, { id: "2" }, { id: "3" }] } }), {
      status: 200,
      headers: { "content-type": "application/json" },
    }),
  ]) {
    const provider = createExternalReadProviderFromPack(syntheticPack(), {
      resolve_credential: async () => ({ api_key: "synthetic" }),
      fetch_impl: async () => response.clone(),
    });
    const registry = createExternalReadProviderRegistry({ providers: [provider] });
    await assert.rejects(
      registry.read({ connection, scope, capability: "bank.transactions.read" }),
      ({ safe_error_code }) => safe_error_code === "EXTERNAL_READ_PROVIDER_FAILED",
    );
  }
});

test("provider execution stops an unannounced oversized response while streaming", async () => {
  let cancelled = false;
  const response = {
    status: 200,
    headers: { get: (name) => name === "content-type" ? "application/json" : null },
    body: {
      getReader() {
        let sent = false;
        return {
          async read() {
            if (sent) return { done: true };
            sent = true;
            return { done: false, value: Buffer.from("x".repeat(33)) };
          },
          async cancel() {
            cancelled = true;
          },
          releaseLock() {},
        };
      },
    },
  };
  const provider = createExternalReadProviderFromPack(syntheticPack(), {
    max_response_bytes: 32,
    resolve_credential: async () => ({ api_key: "synthetic" }),
    fetch_impl: async () => response,
  });
  const registry = createExternalReadProviderRegistry({ providers: [provider] });

  await assert.rejects(
    registry.read({ connection, scope, capability: "bank.transactions.read" }),
    ({ safe_error_code }) => safe_error_code === "EXTERNAL_READ_PROVIDER_FAILED",
  );
  assert.equal(cancelled, true);
});
