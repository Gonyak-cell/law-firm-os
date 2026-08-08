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
const LIMIT = 8;
const EXPECTED_RANGE = `bytes=0-${LIMIT}`;

function responseMetadata({ byteSize, sha256 }) {
  return {
    "lawos-tenant-ref": sha256Hex(Buffer.from(TENANT)),
    "lawos-object-ref": sha256Hex(Buffer.from(OBJECT)),
    "lawos-sha256": sha256,
    "lawos-byte-size": String(byteSize),
  };
}

function trackedStream(bytes, calls) {
  return {
    destroy() { calls.bodyDestroyed = true; },
    cancel() { calls.bodyCancelled = true; },
    async *[Symbol.asyncIterator]() {
      calls.bodyPulls += 1;
      calls.bodyBytes += bytes.byteLength;
      yield Buffer.from(bytes);
    },
  };
}

function fakeClient({
  headBytes,
  getBytes = headBytes,
  headByteSize = headBytes.byteLength,
  headSha = sha256Hex(headBytes),
  metadataByteSize = getBytes.byteLength,
  metadataSha = sha256Hex(getBytes),
  contentRange,
  contentLength,
  omitContentLength = false,
  stream = false,
  bodyFactory,
} = {}) {
  const calls = {
    head: 0,
    get: 0,
    ranges: [],
    getSignal: null,
    providerBytes: 0,
    bodyPulls: 0,
    bodyBytes: 0,
    bodyDestroyed: false,
    bodyCancelled: false,
  };
  return {
    calls,
    async send(command, options = {}) {
      if (command.constructor.name === "HeadObjectCommand") {
        calls.head += 1;
        return {
          ContentLength: headByteSize,
          ContentType: "text/plain",
          Metadata: responseMetadata({ byteSize: headByteSize, sha256: headSha }),
          ETag: "head-etag",
          VersionId: "head-version",
        };
      }
      if (command.constructor.name !== "GetObjectCommand") {
        throw new Error(`unexpected command ${command.constructor.name}`);
      }
      calls.get += 1;
      calls.getSignal = options.abortSignal ?? null;
      calls.ranges.push(command.input.Range);
      assert.equal(command.input.Range, EXPECTED_RANGE);
      const rangeEnd = Number(/^bytes=0-(\d+)$/u.exec(command.input.Range)?.[1]);
      const rangedBytes = getBytes.subarray(0, rangeEnd + 1);
      calls.providerBytes += rangedBytes.byteLength;
      const response = {
        ContentType: "text/plain",
        ContentRange: contentRange
          ?? `bytes 0-${rangedBytes.byteLength - 1}/${getBytes.byteLength}`,
        Metadata: responseMetadata({ byteSize: metadataByteSize, sha256: metadataSha }),
        ETag: "get-etag",
        VersionId: "get-version",
        Body: bodyFactory?.(rangedBytes, calls)
          ?? (stream ? trackedStream(rangedBytes, calls) : Buffer.from(rangedBytes)),
      };
      if (!omitContentLength) response.ContentLength = contentLength ?? rangedBytes.byteLength;
      return response;
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
  const client = fakeClient({ headBytes: Buffer.from("12345678") });
  const storage = adapter(client);
  assert.equal(assertBoundedStorageReader(storage), storage);
  assert.equal(typeof storage.readObjectBounded, "function");
});

test("authoritative oversized S3 HEAD prevents every provider GET/body read", async () => {
  const client = fakeClient({ headBytes: Buffer.from("123456789") });
  await assert.rejects(adapter(client).readObjectBounded({
    tenant_id: TENANT, object_id: OBJECT, max_bytes: LIMIT,
  }), (error) => error.code === DMS_STORAGE_OBJECT_TOO_LARGE);
  assert.equal(client.calls.head, 1);
  assert.equal(client.calls.get, 0);
  assert.equal(client.calls.providerBytes, 0);
  assert.equal(client.calls.bodyPulls, 0);
});

test("exact-limit S3 object uses the inclusive sentinel Range and one digest pass", async () => {
  const bytes = Buffer.from("12345678");
  const client = fakeClient({ headBytes: bytes, stream: true });
  const result = await adapter(client).readObjectBounded({
    tenant_id: TENANT, object_id: OBJECT, max_bytes: LIMIT,
  });
  assert.equal(result.bytes.toString(), bytes.toString());
  assert.equal(result.byte_size, LIMIT);
  assert.equal(result.sha256, sha256Hex(bytes));
  assert.equal(result.declared_sha256, result.sha256);
  assert.equal(client.calls.get, 1);
  assert.deepEqual(client.calls.ranges, [EXPECTED_RANGE]);
  assert.equal(client.calls.providerBytes, LIMIT);
  assert.equal(client.calls.bodyPulls, 1);
  assert.equal(client.calls.bodyBytes, LIMIT);
});

test("false-small HEAD rejects an honest max-plus-one ranged response before Body read", async () => {
  const headBytes = Buffer.from("12345678");
  const client = fakeClient({ headBytes, getBytes: Buffer.from("123456789"), stream: true });
  await assert.rejects(adapter(client).readObjectBounded({
    tenant_id: TENANT, object_id: OBJECT, max_bytes: LIMIT,
  }), (error) => error.code === DMS_STORAGE_OBJECT_TOO_LARGE);
  assert.equal(client.calls.get, 1);
  assert.deepEqual(client.calls.ranges, [EXPECTED_RANGE]);
  assert.equal(client.calls.providerBytes, LIMIT + 1);
  assert.equal(client.calls.bodyPulls, 0);
  assert.equal(client.calls.getSignal.aborted, true);
  assert.equal(client.calls.bodyDestroyed, true);
  assert.equal(client.calls.bodyCancelled, true);
});

test("unknown-length malicious source is range-capped and stops at max plus one", async () => {
  const headBytes = Buffer.from("12345678");
  const hugeSource = Buffer.alloc(1024 * 1024, 0x61);
  const client = fakeClient({
    headBytes,
    getBytes: hugeSource,
    metadataByteSize: headBytes.byteLength,
    metadataSha: sha256Hex(headBytes),
    contentRange: "bytes 0-7/*",
    omitContentLength: true,
    stream: true,
  });
  await assert.rejects(adapter(client).readObjectBounded({
    tenant_id: TENANT, object_id: OBJECT, max_bytes: LIMIT,
  }), (error) => error.code === DMS_STORAGE_OBJECT_TOO_LARGE
    && error.observed_byte_size === LIMIT + 1);
  assert.equal(client.calls.get, 1);
  assert.deepEqual(client.calls.ranges, [EXPECTED_RANGE]);
  assert.equal(client.calls.providerBytes, LIMIT + 1);
  assert.equal(client.calls.bodyPulls, 1);
  assert.equal(client.calls.bodyBytes, LIMIT + 1);
  assert.equal(client.calls.getSignal.aborted, true);
  assert.equal(client.calls.bodyDestroyed, true);
  assert.equal(client.calls.bodyCancelled, true);
});

test("HEAD and ranged GET descriptor mismatch aborts before Body consumption", async () => {
  const client = fakeClient({
    headBytes: Buffer.from("12345678"),
    getBytes: Buffer.from("1234567"),
    stream: true,
  });
  await assert.rejects(adapter(client).readObjectBounded({
    tenant_id: TENANT, object_id: OBJECT, max_bytes: LIMIT,
  }), (error) => error.code === "DMS_COMMITTED_DIGEST_MISMATCH");
  assert.equal(client.calls.providerBytes, 7);
  assert.equal(client.calls.bodyPulls, 0);
  assert.equal(client.calls.getSignal.aborted, true);
  assert.equal(client.calls.bodyDestroyed, true);
  assert.equal(client.calls.bodyCancelled, true);
});

test("provider ContentRange or ContentLength beyond requested sentinel is rejected", async () => {
  const client = fakeClient({
    headBytes: Buffer.from("12345678"),
    getBytes: Buffer.from("123456789"),
    contentRange: "bytes 0-9/10",
    contentLength: 10,
    stream: true,
  });
  await assert.rejects(adapter(client).readObjectBounded({
    tenant_id: TENANT, object_id: OBJECT, max_bytes: LIMIT,
  }), (error) => error.code === "DMS_S3_RANGE_INVALID");
  assert.equal(client.calls.providerBytes, LIMIT + 1);
  assert.equal(client.calls.bodyPulls, 0);
  assert.equal(client.calls.getSignal.aborted, true);
});

test("misleading direct Body is size-checked before copying", async () => {
  const bytes = Buffer.from("12345678");
  const client = fakeClient({
    headBytes: bytes,
    bodyFactory: () => "123456789",
  });
  await assert.rejects(adapter(client).readObjectBounded({
    tenant_id: TENANT, object_id: OBJECT, max_bytes: LIMIT,
  }), (error) => error.code === DMS_STORAGE_OBJECT_TOO_LARGE);
  assert.equal(client.calls.providerBytes, LIMIT);
  assert.equal(client.calls.getSignal.aborted, true);
});
