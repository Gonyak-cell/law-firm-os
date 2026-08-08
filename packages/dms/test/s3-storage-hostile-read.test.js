import assert from "node:assert/strict";
import { PassThrough, Readable } from "node:stream";
import test from "node:test";
import {
  DMS_STORAGE_BODY_UNBOUNDED,
  sha256Hex,
} from "../src/storage/storage-adapter.js";
import {
  EXPECTED_RANGE,
  LIMIT,
  OBJECT,
  TENANT,
  adapter,
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

test("ordinary malicious Readable is rejected before pull, push, or buffering", async () => {
  const hugeSource = Buffer.alloc(1024 * 1024, 0x61);
  let body;
  const client = fakeClient(lyingHeaders({
    getBytes: hugeSource,
    bodyFactory(bytes, calls) {
      body = new Readable({
        read() {
          calls.sourcePulls += 1;
          calls.sourceYieldedBytes += bytes.byteLength;
          this.push(bytes);
          calls.sourcePushedBytes += bytes.byteLength;
        },
      });
      return body;
    },
  }));
  await assert.rejects(adapter(client).readObjectBounded({
    tenant_id: TENANT, object_id: OBJECT, max_bytes: LIMIT,
  }), (error) => error.code === DMS_STORAGE_BODY_UNBOUNDED
    && error.declared_byte_size === LIMIT
    && error.observed_byte_size === 0
    && error.residual_buffered_byte_size === 0
    && error.storage_cleanup_complete === true);
  assert.equal(client.calls.sourceOfferedBytes, hugeSource.byteLength);
  assert.deepEqual(client.calls.ranges, [EXPECTED_RANGE]);
  assert.equal(client.calls.sourcePulls, 0);
  assert.equal(client.calls.sourcePushedBytes, 0);
  assert.equal(client.calls.sourceYieldedBytes, 0);
  assert.equal(body.readableLength, 0);
  assert.equal(client.calls.getSignal.aborted, true);
  assert.equal(body.destroyed, true);
});

test("preloaded PassThrough is rejected and fully drained before return", async () => {
  const hugeSource = Buffer.alloc(1024 * 1024, 0x66);
  let body;
  const client = fakeClient(lyingHeaders({
    getBytes: hugeSource,
    bodyFactory(bytes, calls) {
      body = new PassThrough();
      body.end(bytes);
      calls.sourcePushedBytes += bytes.byteLength;
      return body;
    },
  }));
  await assert.rejects(adapter(client).readObjectBounded({
    tenant_id: TENANT, object_id: OBJECT, max_bytes: LIMIT,
  }), (error) => error.code === DMS_STORAGE_BODY_UNBOUNDED
    && error.observed_byte_size === hugeSource.byteLength
    && error.residual_buffered_byte_size === 0
    && error.storage_cleanup_complete === true);
  assert.equal(client.calls.sourcePushedBytes, hugeSource.byteLength);
  assert.equal(body.readableLength, 0);
  assert.equal(body.writableLength, 0);
  assert.equal(body.destroyed, true);
  assert.equal(body.closed, true);
});

test("nonconforming read(size) object is rejected before its hostile read", async () => {
  const hugeSource = Buffer.alloc(1024 * 1024, 0x65);
  let body;
  const client = fakeClient(lyingHeaders({
    getBytes: hugeSource,
    bodyFactory(bytes, calls) {
      body = {
        readableLength: 0,
        read() {
          calls.sourcePulls += 1;
          calls.sourceYieldedBytes += bytes.byteLength;
          calls.sourceReturnedBytes += bytes.byteLength;
          return bytes;
        },
        once() { return this; },
        removeListener() { return this; },
        destroy() { calls.bodyDestroyed = true; },
      };
      return body;
    },
  }));
  await assert.rejects(adapter(client).readObjectBounded({
    tenant_id: TENANT, object_id: OBJECT, max_bytes: LIMIT,
  }), (error) => error.code === DMS_STORAGE_BODY_UNBOUNDED
    && error.observed_byte_size === 0);
  assert.equal(client.calls.sourcePulls, 0);
  assert.equal(client.calls.sourceReturnedBytes, 0);
  assert.equal(client.calls.sourceYieldedBytes, 0);
  assert.equal(body.readableLength, 0);
  assert.equal(client.calls.bodyDestroyed, true);
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

test("direct hostile Body is rejected without accepting synthetic provider bytes", async () => {
  const hugeSource = Buffer.alloc(1024 * 1024, 0x64);
  const client = fakeClient(lyingHeaders({ getBytes: hugeSource }));
  await assert.rejects(adapter(client).readObjectBounded({
    tenant_id: TENANT, object_id: OBJECT, max_bytes: LIMIT,
  }), (error) => error.code === DMS_STORAGE_BODY_UNBOUNDED
    && error.declared_byte_size === LIMIT
    && error.observed_byte_size === 0);
  assert.equal(client.calls.sourceOfferedBytes, hugeSource.byteLength);
  assert.equal(client.calls.sourcePulls, 0);
  assert.equal(client.calls.sourceYieldedBytes, 0);
});
