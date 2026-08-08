import assert from "node:assert/strict";
import test from "node:test";
import {
  DMS_STORAGE_OBJECT_TOO_LARGE,
  assertBoundedStorageReader,
  sha256Hex,
} from "../src/storage/storage-adapter.js";
import {
  EXPECTED_RANGE,
  LIMIT,
  OBJECT,
  TENANT,
  adapter,
  fakeClient,
} from "./s3-bounded-test-helpers.js";

test("bounded S3 reader test harness exposes the committed-object contract", () => {
  const client = fakeClient({ headBytes: Buffer.from("12345678") });
  const storage = adapter(client);
  assert.equal(assertBoundedStorageReader(storage), storage);
  assert.equal(typeof storage.readObjectBounded, "function");
});

test("authoritative oversized S3 HEAD prevents every provider GET/body read", async () => {
  const client = fakeClient({ headBytes: Buffer.from("123456789") });
  await assert.rejects(adapter(client).readObjectBounded({
    tenant_id: TENANT, object_id: OBJECT, max_bytes: LIMIT,
  }), (error) => error.code === DMS_STORAGE_OBJECT_TOO_LARGE
    && error.declared_byte_size === LIMIT + 1
    && error.observed_byte_size === 0);
  assert.equal(client.calls.head, 1);
  assert.equal(client.calls.get, 0);
  assert.equal(client.calls.sourcePulls, 0);
  assert.equal(client.calls.sourceYieldedBytes, 0);
});

test("exact-limit measured S3 Body uses one GET and a single digest pass", async () => {
  const bytes = Buffer.from("12345678");
  const client = fakeClient({ headBytes: bytes });
  const result = await adapter(client).readObjectBounded({
    tenant_id: TENANT, object_id: OBJECT, max_bytes: LIMIT,
  });
  assert.equal(result.bytes.toString(), bytes.toString());
  assert.equal(result.byte_size, LIMIT);
  assert.equal(result.sha256, sha256Hex(bytes));
  assert.equal(result.declared_sha256, result.sha256);
  assert.equal(client.calls.get, 1);
  assert.deepEqual(client.calls.ranges, [EXPECTED_RANGE]);
  assert.equal(client.calls.sourcePulls, 0);
});

test("authoritative zero-byte HEAD and empty SHA complete without an unsatisfiable GET", async () => {
  const bytes = Buffer.alloc(0);
  const client = fakeClient({ headBytes: bytes });
  const result = await adapter(client).readObjectBounded({
    tenant_id: TENANT, object_id: OBJECT, max_bytes: 0,
  });
  assert.equal(result.byte_size, 0);
  assert.equal(result.bytes.byteLength, 0);
  assert.equal(result.sha256, sha256Hex(bytes));
  assert.equal(result.declared_sha256, result.sha256);
  assert.equal(client.calls.head, 1);
  assert.equal(client.calls.get, 0);
});

test("zero-byte HEAD with a non-empty digest fails closed without GET", async () => {
  const client = fakeClient({ headBytes: Buffer.alloc(0), headSha: "0".repeat(64) });
  await assert.rejects(adapter(client).readObjectBounded({
    tenant_id: TENANT, object_id: OBJECT, max_bytes: 0,
  }), (error) => error.code === "DMS_COMMITTED_DIGEST_MISMATCH"
    && error.declared_byte_size === 0
    && error.observed_byte_size === 0);
  assert.equal(client.calls.head, 1);
  assert.equal(client.calls.get, 0);
});

test("false-small HEAD rejects honest max-plus-one headers before Body read", async () => {
  const client = fakeClient({
    headBytes: Buffer.from("12345678"),
    getBytes: Buffer.from("123456789"),
  });
  await assert.rejects(adapter(client).readObjectBounded({
    tenant_id: TENANT, object_id: OBJECT, max_bytes: LIMIT,
  }), (error) => error.code === DMS_STORAGE_OBJECT_TOO_LARGE
    && error.declared_byte_size === LIMIT + 1
    && error.observed_byte_size === 0);
  assert.deepEqual(client.calls.ranges, [EXPECTED_RANGE]);
  assert.equal(client.calls.sourcePulls, 0);
  assert.equal(client.calls.sourceYieldedBytes, 0);
  assert.equal(client.calls.getSignal.aborted, true);
});
