import assert from "node:assert/strict";
import test from "node:test";
import {
  DMS_STORAGE_BODY_UNBOUNDED,
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

test("bounded S3 reader implements the required storage methods", () => {
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

test("direct Buffer cannot substitute for bounded S3 transport evidence", async () => {
  const bytes = Buffer.from("12345678");
  const client = fakeClient({ headBytes: bytes });
  await assert.rejects(adapter(client).readObjectBounded({
    tenant_id: TENANT, object_id: OBJECT, max_bytes: LIMIT,
  }), (error) => error.code === DMS_STORAGE_BODY_UNBOUNDED
    && error.declared_byte_size === LIMIT
    && error.observed_byte_size === 0);
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
