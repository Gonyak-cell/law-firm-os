import assert from "node:assert/strict";
import { createServer } from "node:net";
import test from "node:test";
import { GetObjectCommand } from "@aws-sdk/client-s3";
import { createBoundedS3Client } from "../src/storage/s3-bounded-client.js";
import { boundedS3ResponseEvidence } from "../src/storage/s3-bounded-http-handler.js";
import { sha256Hex } from "../src/storage/storage-adapter.js";
import {
  EXPECTED_RANGE,
  LIMIT,
  OBJECT,
  TENANT,
  productionAdapter as adapter,
} from "./s3-bounded-test-helpers.js";

const HEAD_BYTES = Buffer.from("12345678");
const FLOOD_BYTES = Buffer.concat([HEAD_BYTES, Buffer.alloc(1024 * 1024 - HEAD_BYTES.length, 0x61)]);

function responseHead(lines) {
  return Buffer.from([...lines, "Connection: close", "", ""].join("\r\n"));
}

function metadataHeaders() {
  return [
    "Content-Type: text/plain",
    `ETag: \"transport-etag\"`,
    `x-amz-meta-lawos-tenant-ref: ${sha256Hex(Buffer.from(TENANT))}`,
    `x-amz-meta-lawos-object-ref: ${sha256Hex(Buffer.from(OBJECT))}`,
    `x-amz-meta-lawos-sha256: ${sha256Hex(HEAD_BYTES)}`,
    `x-amz-meta-lawos-byte-size: ${HEAD_BYTES.byteLength}`,
  ];
}

function rawResponse(mode) {
  if (mode === "chunked") {
    return Buffer.concat([
      responseHead(["HTTP/1.1 206 Partial Content", "Transfer-Encoding: chunked", "Content-Range: bytes 0-7/8"]),
      Buffer.from("100000\r\n"),
      FLOOD_BYTES,
      Buffer.from("\r\n0\r\n\r\n"),
    ]);
  }
  if (mode === "oversized") {
    return Buffer.concat([
      responseHead(["HTTP/1.1 206 Partial Content", `Content-Length: ${FLOOD_BYTES.byteLength}`, `Content-Range: bytes 0-${FLOOD_BYTES.byteLength - 1}/${FLOOD_BYTES.byteLength}`]),
      FLOOD_BYTES,
    ]);
  }
  if (mode === "wrong") {
    return Buffer.concat([
      responseHead(["HTTP/1.1 206 Partial Content", `Content-Length: ${HEAD_BYTES.byteLength}`, "Content-Range: bytes 0-7/8", ...metadataHeaders()]),
      Buffer.from("87654321"),
    ]);
  }
  if (mode === "short") {
    return Buffer.concat([
      responseHead(["HTTP/1.1 206 Partial Content", `Content-Length: ${HEAD_BYTES.byteLength}`, "Content-Range: bytes 0-7/8", ...metadataHeaders()]),
      Buffer.from("1234567"),
    ]);
  }
  return Buffer.concat([
    responseHead(["HTTP/1.1 206 Partial Content", `Content-Length: ${HEAD_BYTES.byteLength}`, "Content-Range: bytes 0-7/8", ...metadataHeaders()]),
    FLOOD_BYTES,
  ]);
}

async function fixture(t, mode) {
  const requests = [];
  const socketErrors = [];
  let providerAttemptedBytes = 0;
  const server = createServer((socket) => {
    socket.on("error", (error) => socketErrors.push(error.code ?? error.name));
    let requestBytes = Buffer.alloc(0);
    socket.on("data", (chunk) => {
      requestBytes = Buffer.concat([requestBytes, chunk]);
      if (!requestBytes.includes("\r\n\r\n")) return;
      socket.removeAllListeners("data");
      const request = requestBytes.toString("latin1");
      const method = request.slice(0, request.indexOf(" "));
      const range = /^range:\s*(.+)$/imu.exec(request)?.[1]?.trim() ?? null;
      requests.push({ method, range });
      if (method === "HEAD") {
        socket.end(responseHead([
          "HTTP/1.1 200 OK",
          `Content-Length: ${HEAD_BYTES.byteLength}`,
          ...metadataHeaders(),
        ]));
        return;
      }
      providerAttemptedBytes = mode === "short"
        ? HEAD_BYTES.byteLength - 1
        : mode === "wrong" ? HEAD_BYTES.byteLength : FLOOD_BYTES.byteLength;
      socket.end(rawResponse(mode));
    });
  });
  await new Promise((resolve, reject) => {
    server.once("error", reject);
    server.listen(0, "127.0.0.1", () => {
      server.removeListener("error", reject);
      resolve();
    });
  });
  const client = createBoundedS3Client({
    endpoint: `http://127.0.0.1:${server.address().port}`,
    region: "us-east-1",
    forcePathStyle: true,
    credentials: { accessKeyId: "local-test", secretAccessKey: "local-test" },
  });
  t.after(async () => {
    client.destroy();
    if (server.listening) await new Promise((resolve) => server.close(resolve));
  });
  return {
    client,
    requests,
    socketErrors,
    providerAttemptedBytes: () => providerAttemptedBytes,
  };
}

test("digest rejection waits for zero residual transport buffer", async (t) => {
  const { client, requests, providerAttemptedBytes } = await fixture(t, "wrong");
  await assert.rejects(adapter(client).readObjectBounded({
    tenant_id: TENANT,
    object_id: OBJECT,
    max_bytes: LIMIT,
  }), (error) => error.code === "DMS_COMMITTED_DIGEST_MISMATCH"
    && error.observed_byte_size === HEAD_BYTES.byteLength
    && error.residual_buffered_byte_size === 0
    && error.storage_cleanup_complete === true);
  assert.equal(providerAttemptedBytes(), HEAD_BYTES.byteLength);
  assert.deepEqual(requests, [
    { method: "HEAD", range: null },
    { method: "GET", range: EXPECTED_RANGE },
  ]);
});

for (const mode of ["chunked", "oversized"]) {
  test(`production adapter rejects a 1 MiB ${mode} response before body admission`, async (t) => {
    const { client, requests, socketErrors, providerAttemptedBytes } = await fixture(t, mode);
    let rejected;
    await assert.rejects(adapter(client).readObjectBounded({
      tenant_id: TENANT,
      object_id: OBJECT,
      max_bytes: LIMIT,
    }), (error) => {
      rejected = error;
      return error.code === "DMS_S3_RANGE_INVALID"
        && error.observed_byte_size <= LIMIT + 1
        && error.residual_buffered_byte_size === 0
        && error.transport_cleanup_complete === true;
    });
    assert.equal(providerAttemptedBytes(), FLOOD_BYTES.byteLength);
    assert.ok(rejected.provider_discarded_byte_size > 0);
    assert.deepEqual(requests, [
      { method: "HEAD", range: null },
      { method: "GET", range: EXPECTED_RANGE },
    ]);
    assert.ok(socketErrors.every((code) => ["ECONNRESET", "EPIPE"].includes(code)));
  });
}

test("valid HTTP framing caps a 1 MiB body flood at the exact object length", async (t) => {
  const { client, requests, providerAttemptedBytes } = await fixture(t, "flood");
  const response = await client.send(new GetObjectCommand({
    Bucket: "bounded-test",
    Key: "bounded/objects/flood",
    Range: EXPECTED_RANGE,
  }));
  const evidence = boundedS3ResponseEvidence(response.Body);
  const bytes = Buffer.from(await response.Body.transformToByteArray());
  assert.equal(bytes.byteLength, HEAD_BYTES.byteLength);
  assert.equal(evidence.observed_byte_size, HEAD_BYTES.byteLength);
  assert.ok(evidence.peak_buffered_byte_size <= LIMIT + 1);
  assert.equal(providerAttemptedBytes(), FLOOD_BYTES.byteLength);
  assert.deepEqual(requests, [{ method: "GET", range: EXPECTED_RANGE }]);
});

test("premature Content-Length close preserves admitted bytes and cleanup evidence", async (t) => {
  const { client, requests, providerAttemptedBytes } = await fixture(t, "short");
  await assert.rejects(adapter(client).readObjectBounded({
    tenant_id: TENANT,
    object_id: OBJECT,
    max_bytes: LIMIT,
  }), (error) => error.code === "ECONNRESET"
    && error.application_consumed_byte_size === HEAD_BYTES.byteLength - 1
    && error.transport_observed_byte_size === HEAD_BYTES.byteLength - 1
    && error.observed_byte_size === HEAD_BYTES.byteLength - 1
    && error.transport_peak_buffered_byte_size <= LIMIT + 1
    && error.residual_buffered_byte_size === 0
    && error.storage_cleanup_complete === true
    && error.transport_cleanup_complete === true);
  assert.equal(providerAttemptedBytes(), HEAD_BYTES.byteLength - 1);
  assert.deepEqual(requests, [
    { method: "HEAD", range: null },
    { method: "GET", range: EXPECTED_RANGE },
  ]);
});
