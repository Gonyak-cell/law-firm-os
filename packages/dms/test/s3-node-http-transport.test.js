import assert from "node:assert/strict";
import { Agent, createServer as createHttpServer } from "node:http";
import test from "node:test";
import { S3Client } from "@aws-sdk/client-s3";
import { NodeHttpHandler } from "@smithy/node-http-handler";
import { createBoundedS3Client } from "../src/storage/s3-bounded-client.js";
import { BoundedS3NodeHttpHandler } from "../src/storage/s3-bounded-http-handler.js";
import { sha256Hex } from "../src/storage/storage-adapter.js";
import {
  EXPECTED_RANGE,
  LIMIT,
  OBJECT,
  TENANT,
  productionAdapter as adapter,
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

test("production adapter keeps its exact bounded handler after replacement attempts", async (t) => {
  const bytes = Buffer.from("12345678");
  const requests = [];
  const warnings = [];
  const logger = { warn: (message) => warnings.push(message) };
  const server = createHttpServer((request, response) => {
    requests.push({
      method: request.method,
      range: request.headers.range ?? null,
      remotePort: request.socket.remotePort,
    });
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
  const httpAgent = new Agent({ keepAlive: true, maxSockets: 1 });
  const client = createBoundedS3Client({
    endpoint: `http://127.0.0.1:${port}`,
    region: "us-east-1",
    forcePathStyle: true,
    credentials: { accessKeyId: "local-test", secretAccessKey: "local-test" },
  }, {
    connectionTimeout: 500,
    httpAgent,
    logger,
    requestTimeout: 1_000,
    socketAcquisitionWarningTimeout: 5_000,
    socketTimeout: 2_000,
    throwOnRequestTimeout: true,
  });
  const handler = client.config.requestHandler;
  const ordinary = new NodeHttpHandler();
  const storage = adapter(client);
  assert.throws(() => {
    client.config.requestHandler = ordinary;
  }, TypeError);
  assert.equal(Reflect.defineProperty(client.config, "requestHandler", { value: ordinary }), false);
  assert.throws(() => {
    client.send = ordinary.handle.bind(ordinary);
  }, TypeError);
  assert.throws(() => {
    handler.handle = ordinary.handle.bind(ordinary);
  }, TypeError);
  t.after(async () => {
    client.destroy();
    ordinary.destroy();
    await close(server);
  });

  const result = await storage.readObjectBounded({
    tenant_id: TENANT,
    object_id: OBJECT,
    max_bytes: LIMIT,
  });
  assert.ok(handler instanceof BoundedS3NodeHttpHandler);
  assert.equal(client.config.requestHandler, handler);
  assert.deepEqual(requests, [
    { method: "HEAD", range: null, remotePort: requests[0].remotePort },
    { method: "GET", range: EXPECTED_RANGE, remotePort: requests[0].remotePort },
  ]);
  assert.equal(result.byte_size, LIMIT);
  assert.equal(result.sha256, sha256Hex(bytes));
  assert.deepEqual(warnings, []);
  const configs = client.config.requestHandler.httpHandlerConfigs();
  assert.equal(configs.connectionTimeout, 500);
  assert.equal(configs.httpAgent, httpAgent);
  assert.equal(configs.logger, logger);
  assert.equal(configs.requestTimeout, 1_000);
  assert.equal(configs.socketAcquisitionWarningTimeout, 5_000);
  assert.equal(configs.socketTimeout, 2_000);
  assert.equal(configs.throwOnRequestTimeout, true);
  assert.ok(configs.httpsAgent);
  client.config.requestHandler.updateHttpClientConfig("socketTimeout", 2_500);
  assert.equal(client.config.requestHandler.httpHandlerConfigs().socketTimeout, 2_500);
});

test("production adapter rejects a real S3Client without the bounded transport", (t) => {
  const client = new S3Client({
    region: "us-east-1",
    credentials: { accessKeyId: "local-test", secretAccessKey: "local-test" },
  });
  t.after(() => client.destroy());
  assert.throws(() => adapter(client), /must be created by createBoundedS3Client/u);
});

test("production adapter rejects a plain forwarding client before provider exposure", (t) => {
  const client = new S3Client({
    region: "us-east-1",
    credentials: { accessKeyId: "local-test", secretAccessKey: "local-test" },
  });
  let sends = 0;
  const wrapper = {
    send(...args) {
      sends += 1;
      return client.send(...args);
    },
  };
  t.after(() => client.destroy());
  assert.throws(() => adapter(wrapper), /must be created by createBoundedS3Client/u);
  assert.equal(sends, 0);
});
