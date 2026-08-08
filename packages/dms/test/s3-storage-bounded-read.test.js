import assert from "node:assert/strict";
import test from "node:test";
import { createS3StorageAdapter } from "../src/storage/s3-storage-adapter.js";
import {
  DMS_STORAGE_OBJECT_TOO_LARGE,
  assertBoundedStorageReader,
  sha256Hex,
} from "../src/storage/storage-adapter.js";

const TENANT = "tenant-bounded-read";
const OBJECT = "object-bounded-read";

function responseMetadata({ byteSize, sha256 }) {
  return {
    "lawos-tenant-ref": sha256Hex(Buffer.from(TENANT)),
    "lawos-object-ref": sha256Hex(Buffer.from(OBJECT)),
    "lawos-sha256": sha256,
    "lawos-byte-size": String(byteSize),
  };
}

function fakeClient({ body, declaredLength, getDeclaredLength = declaredLength, sha256 }) {
  const calls = { head: 0, get: 0, getSignal: null };
  const response = (byteSize) => ({
    ContentLength: byteSize,
    ContentType: "text/plain",
    Metadata: responseMetadata({ byteSize, sha256 }),
    ETag: "bounded-etag",
    VersionId: "bounded-version",
  });
  return {
    calls,
    async send(command, options = {}) {
      if (command.constructor.name === "HeadObjectCommand") {
        calls.head += 1;
        return response(declaredLength);
      }
      if (command.constructor.name === "GetObjectCommand") {
        calls.get += 1;
        calls.getSignal = options.abortSignal ?? null;
        return { ...response(getDeclaredLength), Body: body };
      }
      throw new Error(`unexpected command ${command.constructor.name}`);
    },
  };
}

function adapter(client) {
  return createS3StorageAdapter({
    adapter_id: "s3-bounded-test",
    bucket: "bounded-test",
    prefix: "bounded",
    expected_bucket_owner: "770880870480",
    credential_ref: "aws-role:bounded-test",
    client,
  });
}

test("production S3 adapter exposes the bounded committed-object reader", () => {
  const bytes = Buffer.from("12345678");
  const client = fakeClient({ body: bytes, declaredLength: bytes.byteLength,
    sha256: sha256Hex(bytes) });
  const storage = adapter(client);
  assert.equal(assertBoundedStorageReader(storage), storage);
  assert.equal(typeof storage.readObjectBounded, "function");
});

test("S3 bounded read rejects an oversized HEAD before provider GET", async () => {
  const bytes = Buffer.from("123456789");
  const client = fakeClient({ body: bytes, declaredLength: bytes.byteLength,
    sha256: sha256Hex(bytes) });
  await assert.rejects(adapter(client).readObjectBounded({
    tenant_id: TENANT, object_id: OBJECT, max_bytes: 8,
  }), (error) => error.code === DMS_STORAGE_OBJECT_TOO_LARGE);
  assert.deepEqual(client.calls, { head: 1, get: 0, getSignal: null });
});

test("S3 bounded stream aborts at the first overflowing chunk without a second read", async () => {
  const chunks = [Buffer.from("1234"), Buffer.from("5678"), Buffer.from("9abc"), Buffer.from("never")];
  const counters = { pulls: 0, yieldedBytes: 0, destroyed: false };
  const body = {
    destroy() { counters.destroyed = true; },
    async *[Symbol.asyncIterator]() {
      for (const chunk of chunks) {
        counters.pulls += 1;
        counters.yieldedBytes += chunk.byteLength;
        yield chunk;
      }
    },
  };
  const client = fakeClient({ body, declaredLength: 8,
    sha256: sha256Hex(Buffer.concat(chunks)) });
  await assert.rejects(adapter(client).readObjectBounded({
    tenant_id: TENANT, object_id: OBJECT, max_bytes: 8,
  }), (error) => error.code === DMS_STORAGE_OBJECT_TOO_LARGE);
  assert.equal(client.calls.head, 1);
  assert.equal(client.calls.get, 1);
  assert.equal(client.calls.getSignal.aborted, true);
  assert.equal(counters.destroyed, true);
  assert.equal(counters.pulls, 3);
  assert.ok(counters.yieldedBytes <= 8 + chunks[2].byteLength);
});

test("S3 bounded read aborts an oversized GET ContentLength before Body consumption", async () => {
  const counters = { pulls: 0, destroyed: false };
  const body = {
    destroy() { counters.destroyed = true; },
    async *[Symbol.asyncIterator]() { counters.pulls += 1; yield Buffer.from("never read"); },
  };
  const client = fakeClient({ body, declaredLength: 8, getDeclaredLength: 9,
    sha256: sha256Hex("123456789") });
  await assert.rejects(adapter(client).readObjectBounded({
    tenant_id: TENANT, object_id: OBJECT, max_bytes: 8,
  }), (error) => error.code === DMS_STORAGE_OBJECT_TOO_LARGE);
  assert.equal(client.calls.get, 1);
  assert.equal(client.calls.getSignal.aborted, true);
  assert.equal(counters.destroyed, true);
  assert.equal(counters.pulls, 0);
});

test("S3 bounded read accepts the exact limit and returns the single-pass digest", async () => {
  const bytes = Buffer.from("12345678");
  const client = fakeClient({ body: bytes, declaredLength: bytes.byteLength,
    sha256: sha256Hex(bytes) });
  const result = await adapter(client).readObjectBounded({
    tenant_id: TENANT, object_id: OBJECT, max_bytes: bytes.byteLength,
  });
  assert.equal(result.bytes.toString(), bytes.toString());
  assert.equal(result.byte_size, bytes.byteLength);
  assert.equal(result.sha256, sha256Hex(bytes));
  assert.equal(result.declared_sha256, result.sha256);
  assert.equal(client.calls.get, 1);
});

test("S3 bounded read size-checks a misleading string Body before copying it", async () => {
  const body = "123456789";
  const client = fakeClient({ body, declaredLength: 8, sha256: sha256Hex(body) });
  await assert.rejects(adapter(client).readObjectBounded({
    tenant_id: TENANT, object_id: OBJECT, max_bytes: 8,
  }), (error) => error.code === DMS_STORAGE_OBJECT_TOO_LARGE);
  assert.equal(client.calls.get, 1);
  assert.equal(client.calls.getSignal.aborted, true);
});
