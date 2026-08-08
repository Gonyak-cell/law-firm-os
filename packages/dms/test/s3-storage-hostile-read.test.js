import assert from "node:assert/strict";
import test from "node:test";
import {
  DMS_STORAGE_BODY_UNBOUNDED,
  DMS_STORAGE_OBJECT_TOO_LARGE,
  sha256Hex,
} from "../src/storage/storage-adapter.js";
import {
  EXPECTED_RANGE,
  LIMIT,
  OBJECT,
  TENANT,
  adapter,
  controlledBody,
  fakeClient,
  hostileAsyncBody,
} from "./s3-bounded-test-helpers.js";

const HEAD_BYTES = Buffer.from("12345678");

function lyingHeaders(overrides = {}) {
  return {
    headBytes: HEAD_BYTES,
    metadataByteSize: HEAD_BYTES.byteLength,
    metadataSha: sha256Hex(HEAD_BYTES),
    contentRange: "bytes 0-7/8",
    contentLength: HEAD_BYTES.byteLength,
    ...overrides,
  };
}

test("hostile 1 MiB concrete Body is pulled only through max plus one", async () => {
  const hugeSource = Buffer.alloc(1024 * 1024, 0x61);
  const client = fakeClient(lyingHeaders({
    getBytes: hugeSource,
    bodyFactory: controlledBody,
  }));
  await assert.rejects(adapter(client).readObjectBounded({
    tenant_id: TENANT, object_id: OBJECT, max_bytes: LIMIT,
  }), (error) => error.code === DMS_STORAGE_OBJECT_TOO_LARGE
    && error.declared_byte_size === LIMIT
    && error.observed_byte_size === LIMIT + 1);
  assert.equal(client.calls.sourceOfferedBytes, hugeSource.byteLength);
  assert.deepEqual(client.calls.ranges, [EXPECTED_RANGE]);
  assert.ok(client.calls.readRequests.every((size) => size <= LIMIT + 1));
  assert.equal(client.calls.sourcePulls, 1);
  assert.equal(client.calls.sourceYieldedBytes, LIMIT + 1);
  assert.equal(client.calls.getSignal.aborted, true);
  assert.equal(client.calls.bodyDestroyed, true);
  assert.equal(client.calls.bodyCancelled, true);
});

test("unknown-length hostile async Body is rejected before its first 1 MiB yield", async () => {
  const hugeSource = Buffer.alloc(1024 * 1024, 0x62);
  const client = fakeClient(lyingHeaders({
    getBytes: hugeSource,
    contentRange: "bytes 0-7/*",
    omitContentLength: true,
    bodyFactory: hostileAsyncBody,
  }));
  await assert.rejects(adapter(client).readObjectBounded({
    tenant_id: TENANT, object_id: OBJECT, max_bytes: LIMIT,
  }), (error) => error.code === "DMS_S3_RANGE_INVALID"
    && error.declared_byte_size === LIMIT
    && error.observed_byte_size === 0);
  assert.equal(client.calls.sourceOfferedBytes, hugeSource.byteLength);
  assert.equal(client.calls.sourcePulls, 0);
  assert.equal(client.calls.sourceYieldedBytes, 0);
  assert.equal(client.calls.getSignal.aborted, true);
});

test("known-length generic async iterable is rejected before any pull", async () => {
  const hugeSource = Buffer.alloc(1024 * 1024, 0x63);
  const client = fakeClient(lyingHeaders({
    getBytes: hugeSource,
    bodyFactory: hostileAsyncBody,
  }));
  await assert.rejects(adapter(client).readObjectBounded({
    tenant_id: TENANT, object_id: OBJECT, max_bytes: LIMIT,
  }), (error) => error.code === DMS_STORAGE_BODY_UNBOUNDED
    && error.declared_byte_size === LIMIT
    && error.observed_byte_size === 0);
  assert.equal(client.calls.sourcePulls, 0);
  assert.equal(client.calls.sourceYieldedBytes, 0);
  assert.equal(client.calls.getSignal.aborted, true);
});

test("HEAD and ranged GET descriptor mismatch aborts before Body consumption", async () => {
  const client = fakeClient({
    headBytes: HEAD_BYTES,
    getBytes: Buffer.from("1234567"),
    concreteBody: true,
  });
  await assert.rejects(adapter(client).readObjectBounded({
    tenant_id: TENANT, object_id: OBJECT, max_bytes: LIMIT,
  }), (error) => error.code === "DMS_COMMITTED_DIGEST_MISMATCH"
    && error.declared_byte_size === LIMIT
    && error.provider_declared_byte_size === 7
    && error.observed_byte_size === 0);
  assert.equal(client.calls.sourcePulls, 0);
  assert.equal(client.calls.sourceYieldedBytes, 0);
});

test("provider headers beyond requested sentinel reject before Body consumption", async () => {
  const client = fakeClient({
    headBytes: HEAD_BYTES,
    getBytes: Buffer.from("123456789"),
    contentRange: "bytes 0-9/10",
    contentLength: 10,
    concreteBody: true,
  });
  await assert.rejects(adapter(client).readObjectBounded({
    tenant_id: TENANT, object_id: OBJECT, max_bytes: LIMIT,
  }), (error) => error.code === "DMS_S3_RANGE_INVALID"
    && error.declared_byte_size === LIMIT
    && error.provider_declared_byte_size === 10
    && error.observed_byte_size === 0);
  assert.equal(client.calls.sourcePulls, 0);
  assert.equal(client.calls.sourceYieldedBytes, 0);
});

test("direct hostile Body reports its actual size instead of a clamped sentinel", async () => {
  const hugeSource = Buffer.alloc(1024 * 1024, 0x64);
  const client = fakeClient(lyingHeaders({ getBytes: hugeSource }));
  await assert.rejects(adapter(client).readObjectBounded({
    tenant_id: TENANT, object_id: OBJECT, max_bytes: LIMIT,
  }), (error) => error.code === DMS_STORAGE_OBJECT_TOO_LARGE
    && error.declared_byte_size === LIMIT
    && error.observed_byte_size === hugeSource.byteLength);
  assert.equal(client.calls.sourceOfferedBytes, hugeSource.byteLength);
  assert.equal(client.calls.sourcePulls, 0);
  assert.equal(client.calls.sourceYieldedBytes, 0);
});
