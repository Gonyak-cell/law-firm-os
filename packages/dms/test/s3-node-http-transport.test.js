import assert from "node:assert/strict";
import { IncomingMessage, createServer as createHttpServer } from "node:http";
import { createServer as createNetServer } from "node:net";
import test from "node:test";
import { S3Client } from "@aws-sdk/client-s3";
import { NodeHttpHandler } from "@smithy/node-http-handler";
import {
  DMS_STORAGE_OBJECT_TOO_LARGE,
  readStorageBodyBounded,
  sha256Hex,
} from "../src/storage/storage-adapter.js";
import { assertS3ProviderBody } from "../src/storage/s3-provider-body.js";
import {
  EXPECTED_RANGE,
  LIMIT,
  OBJECT,
  TENANT,
  adapter,
} from "./s3-bounded-test-helpers.js";

async function listen(server) {
  await new Promise((resolve, reject) => {
    server.once("error", reject);
    server.listen(0, "127.0.0.1", () => {
      server.removeListener("error", reject);
      resolve();
    });
  });
  return server.address().port;
}

async function close(server) {
  if (!server.listening) return;
  await new Promise((resolve, reject) => {
    server.close((error) => (error ? reject(error) : resolve()));
  });
}

function objectMetadataHeaders(bytes) {
  return {
    "x-amz-meta-lawos-tenant-ref": sha256Hex(Buffer.from(TENANT)),
    "x-amz-meta-lawos-object-ref": sha256Hex(Buffer.from(OBJECT)),
    "x-amz-meta-lawos-sha256": sha256Hex(bytes),
    "x-amz-meta-lawos-byte-size": String(bytes.byteLength),
  };
}

test("installed AWS SDK NodeHttpHandler retains a framed IncomingMessage Body", async (t) => {
  const bytes = Buffer.from("12345678");
  const requests = [];
  const server = createHttpServer((request, response) => {
    requests.push({ method: request.method, range: request.headers.range ?? null });
    const common = {
      "content-length": String(bytes.byteLength),
      "content-type": "text/plain",
      etag: "\"node-handler-etag\"",
      ...objectMetadataHeaders(bytes),
    };
    if (request.method === "HEAD") {
      response.writeHead(200, common);
      response.end();
      return;
    }
    response.writeHead(206, {
      ...common,
      "content-range": `bytes 0-${bytes.byteLength - 1}/${bytes.byteLength}`,
    });
    response.end(bytes);
  });
  const port = await listen(server);
  const bodies = [];
  const delegate = new NodeHttpHandler();
  const requestHandler = {
    metadata: delegate.metadata,
    async handle(...args) {
      const result = await delegate.handle(...args);
      bodies.push(result.response.body);
      return result;
    },
    destroy() { delegate.destroy(); },
  };
  const client = new S3Client({
    endpoint: `http://127.0.0.1:${port}`,
    region: "us-east-1",
    forcePathStyle: true,
    credentials: { accessKeyId: "local-test", secretAccessKey: "local-test" },
    requestHandler,
  });
  t.after(async () => {
    client.destroy();
    await close(server);
  });

  const result = await adapter(client).readObjectBounded({
    tenant_id: TENANT,
    object_id: OBJECT,
    max_bytes: LIMIT,
  });
  const getBody = bodies.find((body) => body?.statusCode === 206);
  assert.ok(getBody instanceof IncomingMessage);
  assert.equal(Object.getPrototypeOf(getBody).constructor, IncomingMessage);
  assert.equal(typeof getBody.transformToByteArray, "function");
  assert.equal(getBody.headers["content-length"], String(LIMIT));
  assert.deepEqual(requests, [
    { method: "HEAD", range: null },
    { method: "GET", range: EXPECTED_RANGE },
  ]);
  assert.equal(result.byte_size, LIMIT);
  assert.equal(result.sha256, sha256Hex(bytes));
});

test("Node HTTP framing exposes at most max plus one bytes from an excessive response", async (t) => {
  const providerBytes = Buffer.alloc(1024 * 1024, 0x61);
  const socketErrors = [];
  let providerAttemptedBytes = 0;
  let rawRequest = "";
  const server = createNetServer((socket) => {
    socket.on("error", (error) => socketErrors.push(error.code ?? error.name));
    socket.once("data", (requestBytes) => {
      rawRequest = requestBytes.toString("latin1");
      const headers = Buffer.from([
        "HTTP/1.1 206 Partial Content",
        `Content-Length: ${LIMIT + 1}`,
        `Content-Range: bytes 0-${LIMIT}/${providerBytes.byteLength}`,
        "Connection: close",
        "",
        "",
      ].join("\r\n"));
      providerAttemptedBytes = providerBytes.byteLength;
      socket.end(Buffer.concat([headers, providerBytes]));
    });
  });
  const port = await listen(server);
  const handler = new NodeHttpHandler();
  t.after(async () => {
    handler.destroy();
    await close(server);
  });

  const { response } = await handler.handle({
    protocol: "http:",
    hostname: "127.0.0.1",
    port,
    method: "GET",
    path: "/bounded",
    headers: { range: EXPECTED_RANGE },
  });
  const body = assertS3ProviderBody({
    Body: response.body,
    ContentRange: response.headers["content-range"],
  }, {
    max_bytes: LIMIT,
    declared_byte_size: LIMIT,
    content_length: LIMIT + 1,
  });
  let applicationObservedBytes = 0;
  await assert.rejects(readStorageBodyBounded(body, { max_bytes: LIMIT }), (error) => {
    applicationObservedBytes = error.observed_byte_size;
    return error.code === DMS_STORAGE_OBJECT_TOO_LARGE;
  });
  assert.match(rawRequest.toLowerCase(), /range: bytes=0-8/u);
  assert.equal(providerAttemptedBytes, providerBytes.byteLength);
  assert.ok(providerAttemptedBytes > LIMIT + 1);
  assert.equal(applicationObservedBytes, LIMIT + 1);
  assert.ok(applicationObservedBytes <= LIMIT + 1);
  assert.equal(body.readableLength, 0);
  assert.ok(socketErrors.every((code) => ["ECONNRESET", "EPIPE"].includes(code)));
});
