import assert from "node:assert/strict";
import {
  createS3StorageAdapter,
  createS3StorageAdapterForTest,
} from "../src/storage/s3-storage-adapter.js";
import { sha256Hex } from "../src/storage/storage-adapter.js";

export const TENANT = "tenant-bounded-read";
export const OBJECT = "object-bounded-read";
export const LIMIT = 8;
export const EXPECTED_RANGE = `bytes=0-${LIMIT}`;

function responseMetadata({ byteSize, sha256 }) {
  return {
    "lawos-tenant-ref": sha256Hex(Buffer.from(TENANT)),
    "lawos-object-ref": sha256Hex(Buffer.from(OBJECT)),
    "lawos-sha256": sha256,
    "lawos-byte-size": String(byteSize),
  };
}

export function hostileAsyncBody(bytes, calls) {
  return {
    destroy() { calls.bodyDestroyed = true; },
    cancel() { calls.bodyCancelled = true; },
    async *[Symbol.asyncIterator]() {
      calls.sourcePulls += 1;
      calls.sourceYieldedBytes += bytes.byteLength;
      yield bytes;
    },
  };
}

export function fakeClient({
  headBytes,
  getBytes = headBytes,
  headByteSize = headBytes.byteLength,
  headSha = sha256Hex(headBytes),
  metadataByteSize = getBytes.byteLength,
  metadataSha = sha256Hex(getBytes),
  contentRange,
  contentLength,
  omitContentLength = false,
  bodyFactory,
} = {}) {
  const calls = {
    head: 0,
    get: 0,
    ranges: [],
    getSignal: null,
    sourceOfferedBytes: 0,
    sourcePulls: 0,
    sourcePushedBytes: 0,
    sourceReturnedBytes: 0,
    sourceYieldedBytes: 0,
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
      const rangeByteSize = Math.min(getBytes.byteLength, rangeEnd + 1);
      calls.sourceOfferedBytes = getBytes.byteLength;
      const response = {
        ContentType: "text/plain",
        ContentRange: contentRange ?? `bytes 0-${rangeByteSize - 1}/${getBytes.byteLength}`,
        Metadata: responseMetadata({ byteSize: metadataByteSize, sha256: metadataSha }),
        ETag: "get-etag",
        VersionId: "get-version",
        Body: bodyFactory?.(getBytes, calls) ?? Buffer.from(getBytes),
      };
      if (!omitContentLength) response.ContentLength = contentLength ?? rangeByteSize;
      return response;
    },
  };
}

export function adapter(client) {
  return createS3StorageAdapterForTest({
    adapter_id: "s3-bounded-test",
    bucket: "bounded-test",
    prefix: "bounded",
    expected_bucket_owner: "770880870480",
    credential_ref: "aws-role:bounded-test",
    client,
  });
}

export function productionAdapter(client) {
  return createS3StorageAdapter({
    adapter_id: "s3-bounded-test",
    bucket: "bounded-test",
    prefix: "bounded",
    expected_bucket_owner: "770880870480",
    credential_ref: "aws-role:bounded-test",
    client,
  });
}
