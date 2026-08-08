import assert from "node:assert/strict";
import { createServer } from "node:http";
import test from "node:test";
import { GetObjectCommand, HeadObjectCommand } from "@aws-sdk/client-s3";
import { createBoundedS3Client } from "../src/storage/s3-bounded-client.js";
import { createOwnedGetObjectCommand } from "../src/storage/s3-bounded-commands.js";
import { sha256Hex } from "../src/storage/storage-adapter.js";
import {
  EXPECTED_RANGE,
  LIMIT,
  OBJECT,
  TENANT,
  productionAdapter,
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
  await new Promise((resolve, reject) => server.close((error) => error ? reject(error) : resolve()));
}

function restore(object, property, descriptor) {
  if (descriptor) Object.defineProperty(object, property, descriptor);
  else delete object[property];
}

test("post-construction S3 command prototype and instance mutations cannot short-circuit transport", async (t) => {
  const bytes = Buffer.from("12345678");
  const metadata = {
    "lawos-tenant-ref": sha256Hex(Buffer.from(TENANT)),
    "lawos-object-ref": sha256Hex(Buffer.from(OBJECT)),
    "lawos-sha256": sha256Hex(bytes),
    "lawos-byte-size": String(bytes.byteLength),
  };
  const requests = [];
  let providerBytes = 0;
  const server = createServer((request, response) => {
    requests.push({ method: request.method, range: request.headers.range ?? null });
    const headers = {
      "content-length": String(bytes.byteLength),
      "content-type": "text/plain",
      ...Object.fromEntries(Object.entries(metadata).map(([name, value]) => [
        `x-amz-meta-${name}`, value,
      ])),
    };
    if (request.method === "HEAD") {
      response.writeHead(200, headers);
      response.end();
      return;
    }
    providerBytes += bytes.byteLength;
    response.writeHead(206, { ...headers, "content-range": "bytes 0-7/8" });
    response.end(bytes);
  });
  const port = await listen(server);
  const client = createBoundedS3Client({
    endpoint: `http://127.0.0.1:${port}`,
    region: "us-east-1",
    forcePathStyle: true,
    credentials: { accessKeyId: "local-test", secretAccessKey: "local-test" },
  });
  const storage = productionAdapter(client);
  t.after(async () => {
    client.destroy();
    await close(server);
  });

  const prototypes = [HeadObjectCommand.prototype, GetObjectCommand.prototype];
  const properties = ["resolveMiddleware", "resolveMiddlewareWithContext"];
  const descriptors = prototypes.flatMap((prototype) => properties.map((property) => ({
    descriptor: Object.getOwnPropertyDescriptor(prototype, property),
    property,
    prototype,
  })));
  let shortCircuits = 0;
  const direct = {
    Body: Buffer.from(bytes),
    ContentLength: bytes.byteLength,
    ContentRange: "bytes 0-7/8",
    ContentType: "text/plain",
    Metadata: metadata,
  };
  const malicious = () => {
    shortCircuits += 1;
    return async () => ({ output: direct });
  };
  for (const { property, prototype } of descriptors) {
    Object.defineProperty(prototype, property, {
      configurable: true,
      value: malicious,
      writable: true,
    });
  }

  try {
    const injected = new GetObjectCommand({
      Bucket: "bounded-test",
      Key: "bounded/objects/injected",
      Range: EXPECTED_RANGE,
    });
    Object.defineProperty(injected, "resolveMiddleware", { value: malicious });
    assert.throws(() => client.send(injected), /fresh owned command/u);
    assert.equal(requests.length, 0);

    const stacked = createOwnedGetObjectCommand({
      Bucket: "bounded-test",
      Key: "bounded/objects/stacked",
      Range: EXPECTED_RANGE,
    });
    stacked.middlewareStack.add(malicious, { name: "syntheticShortCircuit", step: "initialize" });
    assert.throws(() => client.send(stacked), /fresh owned command/u);
    assert.equal(requests.length, 0);

    const owned = createOwnedGetObjectCommand({
      Bucket: "bounded-test",
      Key: "bounded/objects/owned",
      Range: EXPECTED_RANGE,
    });
    assert.throws(() => { owned.resolveMiddleware = malicious; }, TypeError);
    assert.equal(Reflect.defineProperty(owned, "resolveMiddleware", { value: malicious }), false);
    const directResponse = await client.send(owned);
    assert.equal(Buffer.from(await directResponse.Body.transformToByteArray()).toString(), bytes.toString());

    const result = await storage.readObjectBounded({
      tenant_id: TENANT,
      object_id: OBJECT,
      max_bytes: LIMIT,
    });
    assert.equal(result.sha256, sha256Hex(bytes));
  } finally {
    for (const { descriptor, property, prototype } of descriptors) {
      restore(prototype, property, descriptor);
    }
  }
  assert.equal(shortCircuits, 0);
  assert.deepEqual(requests, [
    { method: "GET", range: EXPECTED_RANGE },
    { method: "HEAD", range: null },
    { method: "GET", range: EXPECTED_RANGE },
  ]);
  assert.equal(providerBytes, bytes.byteLength * 2);
});
