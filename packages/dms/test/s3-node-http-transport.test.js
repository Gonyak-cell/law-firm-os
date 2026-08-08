import assert from "node:assert/strict";
import { createServer as createHttpServer } from "node:http";
import test from "node:test";
import { S3Client } from "@aws-sdk/client-s3";
import { createBoundedS3Client } from "../src/storage/s3-bounded-client.js";
import { BoundedS3NodeHttpHandler } from "../src/storage/s3-bounded-http-handler.js";
import { sha256Hex } from "../src/storage/storage-adapter.js";
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

test("production adapter uses the installed SDK with the bounded Node HTTP handler", async (t) => {
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
  const client = createBoundedS3Client({
    endpoint: `http://127.0.0.1:${port}`,
    region: "us-east-1",
    forcePathStyle: true,
    credentials: { accessKeyId: "local-test", secretAccessKey: "local-test" },
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
  assert.ok(client.config.requestHandler instanceof BoundedS3NodeHttpHandler);
  assert.deepEqual(requests, [
    { method: "HEAD", range: null },
    { method: "GET", range: EXPECTED_RANGE },
  ]);
  assert.equal(result.byte_size, LIMIT);
  assert.equal(result.sha256, sha256Hex(bytes));
});

test("production adapter rejects a real S3Client without the bounded transport", (t) => {
  const client = new S3Client({
    region: "us-east-1",
    credentials: { accessKeyId: "local-test", secretAccessKey: "local-test" },
  });
  t.after(() => client.destroy());
  assert.throws(() => adapter(client), /must be created by createBoundedS3Client/u);
});
