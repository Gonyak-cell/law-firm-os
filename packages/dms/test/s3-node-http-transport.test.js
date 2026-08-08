import assert from "node:assert/strict";
import { Agent, createServer as createHttpServer } from "node:http";
import test from "node:test";
import { runInNewContext } from "node:vm";
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

test("production adapter keeps exact dispatch across middleware, prototype, realm, and concurrent attacks", async (t) => {
  const bytes = Buffer.from("12345678");
  let providerBytes = 0;
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
    providerBytes += bytes.byteLength;
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
  const dispatch = Object.getOwnPropertyDescriptor(handler, "handle");
  assert.deepEqual(
    { configurable: dispatch.configurable, writable: dispatch.writable },
    { configurable: false, writable: false },
  );
  const ordinary = new NodeHttpHandler();
  const derived = new (class extends NodeHttpHandler {})();
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
  const foreignHandler = runInNewContext("({ handle() { throw new Error('foreign handler used'); } })");
  for (const replacement of [derived, new Proxy(ordinary, {}), foreignHandler]) {
    assert.throws(() => {
      client.config.requestHandler = replacement;
    }, TypeError);
    assert.equal(Reflect.defineProperty(client.config, "requestHandler", { value: replacement }), false);
  }
  assert.throws(() => Object.setPrototypeOf(handler, foreignHandler), TypeError);
  assert.equal(Reflect.setPrototypeOf(handler, foreignHandler), false);
  t.after(async () => {
    client.destroy();
    derived.destroy();
    ordinary.destroy();
    await close(server);
  });

  const handlerPrototype = Object.getPrototypeOf(handler);
  const originalHandle = Object.getOwnPropertyDescriptor(handlerPrototype, "handle");
  const originalParent = Object.getPrototypeOf(handlerPrototype);
  let prototypeCalls = 0;
  Object.defineProperty(handlerPrototype, "handle", {
    configurable: true,
    value: (...args) => {
      prototypeCalls += 1;
      return ordinary.handle(...args);
    },
    writable: true,
  });
  assert.equal(Reflect.setPrototypeOf(handlerPrototype, foreignHandler), true);
  let results;
  try {
    results = await Promise.all(Array.from({ length: 3 }, () => storage.readObjectBounded({
      tenant_id: TENANT,
      object_id: OBJECT,
      max_bytes: LIMIT,
    })));
  } finally {
    Reflect.setPrototypeOf(handlerPrototype, originalParent);
    if (originalHandle) Object.defineProperty(handlerPrototype, "handle", originalHandle);
    else delete handlerPrototype.handle;
  }
  assert.ok(handler instanceof BoundedS3NodeHttpHandler);
  assert.equal(client.config.requestHandler, handler);
  assert.equal(prototypeCalls, 0);
  assert.equal(requests.length, results.length * 2);
  assert.equal(requests.filter(({ method }) => method === "HEAD").length, results.length);
  assert.equal(requests.filter(({ method, range }) => method === "GET" && range === EXPECTED_RANGE).length, results.length);
  assert.ok(requests.every(({ remotePort }) => remotePort === requests[0].remotePort));
  assert.equal(providerBytes, results.length * LIMIT);
  for (const result of results) {
    assert.equal(result.byte_size, LIMIT);
    assert.equal(result.sha256, sha256Hex(bytes));
  }
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
