import assert from "node:assert/strict";
import test from "node:test";
import {
  EXTERNAL_READ_PROVIDER_PACK_BUNDLE_SCHEMA_VERSION,
  LAWOS_EXTERNAL_READ_PROVIDER_PACKS_JSON_ENV,
  LAWOS_EXTERNAL_READ_PROVIDER_PACKS_SECRET_ID_ENV,
  LAWOS_EXTERNAL_READ_PROVIDER_PACKS_SHA256_ENV,
  hashExternalReadProviderPackBundle,
  resolveExternalReadProviderPacks,
  resolveExternalReadProviderPacksFromConfig,
} from "../src/external-read-provider-pack-config.js";

function bundle() {
  return {
    schema_version: EXTERNAL_READ_PROVIDER_PACK_BUNDLE_SCHEMA_VERSION,
    packs: [{
      provider_id: "future-bank",
      display_name: "Future Bank",
      adapter_version: "1.0.0",
      base_url: "https://future-bank.invalid",
      auth: {
        type: "api_key",
        placement: "header",
        header_name: "X-Api-Key",
      },
      probe_capability: "bank.transactions.read",
      capabilities: [{
        capability: "bank.transactions.read",
        path: "/v1/transactions",
        items_path: ["transactions"],
        field_map: { external_id: ["id"] },
        required_fields: ["external_id"],
      }],
    }],
  };
}

test("no provider bundle truthfully resolves to zero approved providers", () => {
  assert.deepEqual(resolveExternalReadProviderPacks({ env: {} }), []);
});

test("a hash-bound provider bundle loads a closed and normalized provider pack", () => {
  const raw = JSON.stringify(bundle());
  const packs = resolveExternalReadProviderPacks({ env: {
    [LAWOS_EXTERNAL_READ_PROVIDER_PACKS_JSON_ENV]: raw,
    [LAWOS_EXTERNAL_READ_PROVIDER_PACKS_SHA256_ENV]: hashExternalReadProviderPackBundle(raw),
  } });
  assert.equal(packs.length, 1);
  assert.equal(packs[0].provider_id, "future-bank");
  assert.equal(packs[0].schema_version, "law-firm-os.external-read-provider-pack.v2");
});

test("production provider packs resolve from one exact hash-bound Secrets Manager object", async () => {
  const raw = JSON.stringify(bundle());
  const calls = [];
  const packs = await resolveExternalReadProviderPacksFromConfig({
    env: {
      AWS_REGION: "ap-northeast-2",
      [LAWOS_EXTERNAL_READ_PROVIDER_PACKS_SECRET_ID_ENV]:
        "/lawos/production/external-read/provider-packs",
      [LAWOS_EXTERNAL_READ_PROVIDER_PACKS_SHA256_ENV]:
        hashExternalReadProviderPackBundle(raw),
    },
    resolveSecret: async (input) => {
      calls.push(input);
      return raw;
    },
  });
  assert.equal(packs.length, 1);
  assert.equal(packs[0].provider_id, "future-bank");
  assert.deepEqual(calls, [{
    secretId: "/lawos/production/external-read/provider-packs",
    region: "ap-northeast-2",
    client: undefined,
  }]);
});

test("provider pack startup rejects ambiguous or partial secret configuration before AWS access", async () => {
  const raw = JSON.stringify(bundle());
  let reads = 0;
  const resolveSecret = async () => {
    reads += 1;
    return raw;
  };
  await assert.rejects(resolveExternalReadProviderPacksFromConfig({
    env: {
      AWS_REGION: "ap-northeast-2",
      [LAWOS_EXTERNAL_READ_PROVIDER_PACKS_JSON_ENV]: raw,
      [LAWOS_EXTERNAL_READ_PROVIDER_PACKS_SECRET_ID_ENV]:
        "/lawos/production/external-read/provider-packs",
      [LAWOS_EXTERNAL_READ_PROVIDER_PACKS_SHA256_ENV]:
        hashExternalReadProviderPackBundle(raw),
    },
    resolveSecret,
  }), /exactly one configuration source/u);
  await assert.rejects(resolveExternalReadProviderPacksFromConfig({
    env: {
      AWS_REGION: "ap-northeast-2",
      [LAWOS_EXTERNAL_READ_PROVIDER_PACKS_SECRET_ID_ENV]:
        "/lawos/production/external-read/provider-packs",
    },
    resolveSecret,
  }), /must be configured together/u);
  assert.equal(reads, 0);
});

test("provider bundle drift, partial configuration, and extra fields fail startup closed", () => {
  const raw = JSON.stringify(bundle());
  assert.throws(() => resolveExternalReadProviderPacks({ env: {
    [LAWOS_EXTERNAL_READ_PROVIDER_PACKS_JSON_ENV]: raw,
  } }), /must be configured together/u);
  assert.throws(() => resolveExternalReadProviderPacks({ env: {
    [LAWOS_EXTERNAL_READ_PROVIDER_PACKS_JSON_ENV]: raw,
    [LAWOS_EXTERNAL_READ_PROVIDER_PACKS_SHA256_ENV]: "0".repeat(64),
  } }), (error) => error.safe_error_code === "EXTERNAL_READ_PROVIDER_PACK_BUNDLE_HASH_MISMATCH");
  const drifted = JSON.stringify({ ...bundle(), arbitrary_runtime_code: "forbidden" });
  assert.throws(() => resolveExternalReadProviderPacks({ env: {
    [LAWOS_EXTERNAL_READ_PROVIDER_PACKS_JSON_ENV]: drifted,
    [LAWOS_EXTERNAL_READ_PROVIDER_PACKS_SHA256_ENV]: hashExternalReadProviderPackBundle(drifted),
  } }), /unsupported fields/u);
});
