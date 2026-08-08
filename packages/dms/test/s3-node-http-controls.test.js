import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { Agent as HttpsAgent, createServer as createHttpsServer } from "node:https";
import { createServer as createTcpServer } from "node:net";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import { GetObjectCommand } from "@aws-sdk/client-s3";
import { createBoundedS3Client } from "../src/storage/s3-bounded-client.js";
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
  await new Promise((resolve) => server.close(resolve));
}

function client(endpoint, requestHandlerOptions) {
  return createBoundedS3Client({
    endpoint,
    maxAttempts: 1,
    region: "us-east-1",
    forcePathStyle: true,
    credentials: { accessKeyId: "local-test", secretAccessKey: "local-test" },
  }, requestHandlerOptions);
}

function get(clientInstance, options) {
  return clientInstance.send(new GetObjectCommand({
    Bucket: "bounded-test",
    Key: "bounded/objects/controls",
    Range: EXPECTED_RANGE,
  }), options);
}

function activeAgentSockets(agent) {
  return Object.values(agent.sockets).reduce((total, sockets) => total + sockets.length, 0);
}

test("split slow chunked response rejects before admission and closes locally", async (t) => {
  let attemptedBytes = 0;
  let releaseAttempt;
  const attempted = new Promise((resolve) => { releaseAttempt = resolve; });
  const server = createTcpServer((socket) => socket.once("data", () => {
    socket.write([
      "HTTP/1.1 206 Partial Content",
      "Transfer-Encoding: chunked",
      "Content-Range: bytes 0-7/8",
      "Connection: close",
      "",
      "",
    ].join("\r\n"));
    setTimeout(() => {
      attemptedBytes = 2_048;
      socket.end(`400\r\n${"a".repeat(1_024)}\r\n400\r\n${"b".repeat(1_024)}\r\n0\r\n\r\n`);
      releaseAttempt();
    }, 10);
  }));
  const port = await listen(server);
  const bounded = client(`http://127.0.0.1:${port}`);
  t.after(async () => {
    bounded.destroy();
    await close(server);
  });
  await assert.rejects(get(bounded), (error) => error.code === "DMS_S3_RANGE_INVALID"
    && error.observed_byte_size === 0
    && error.residual_buffered_byte_size === 0
    && error.transport_cleanup_complete === true);
  await attempted;
  assert.equal(attemptedBytes, 2_048);
  assert.equal(activeAgentSockets(bounded.config.requestHandler.httpHandlerConfigs().httpAgent), 0);
});

for (const scenario of [
  { name: "abort", options: { requestTimeout: 1_000, socketTimeout: 1_000 } },
  { name: "request timeout", options: { requestTimeout: 25, socketTimeout: 1_000 } },
  { name: "socket timeout", options: { requestTimeout: 1_000, socketTimeout: 25 } },
]) {
  test(`bounded ranged ${scenario.name} closes its configured agent socket`, async (t) => {
    let requestReceived;
    const received = new Promise((resolve) => { requestReceived = resolve; });
    const server = createTcpServer((socket) => socket.once("data", requestReceived));
    const port = await listen(server);
    const bounded = client(`http://127.0.0.1:${port}`, {
      ...scenario.options,
      throwOnRequestTimeout: true,
    });
    const controller = new AbortController();
    t.after(async () => {
      bounded.destroy();
      await close(server);
    });
    const pending = get(bounded, scenario.name === "abort" ? { abortSignal: controller.signal } : undefined);
    await received;
    if (scenario.name === "abort") controller.abort();
    await assert.rejects(pending, (error) => scenario.name === "abort"
      ? error.name === "AbortError"
      : error.name === "TimeoutError" && error.code === "ETIMEDOUT");
    assert.equal(activeAgentSockets(bounded.config.requestHandler.httpHandlerConfigs().httpAgent), 0);
  });
}

function tlsFiles() {
  const directory = mkdtempSync(join(tmpdir(), "lawos-s3-bounded-tls-"));
  const config = join(directory, "openssl.cnf");
  const key = join(directory, "key.pem");
  const cert = join(directory, "cert.pem");
  writeFileSync(config, [
    "[req]",
    "distinguished_name=dn",
    "x509_extensions=ext",
    "prompt=no",
    "[dn]",
    "CN=127.0.0.1",
    "[ext]",
    "subjectAltName=IP:127.0.0.1",
  ].join("\n"));
  execFileSync("openssl", ["req", "-x509", "-newkey", "rsa:2048", "-nodes", "-days", "1", "-config", config, "-keyout", key, "-out", cert], { stdio: "ignore" });
  return { directory, key: readFileSync(key), cert: readFileSync(cert) };
}

test("custom trusted HTTPS agent serves the exact bounded object", async (t) => {
  const tls = tlsFiles();
  const bytes = Buffer.from("12345678");
  const metadata = {
    "x-amz-meta-lawos-tenant-ref": sha256Hex(Buffer.from(TENANT)),
    "x-amz-meta-lawos-object-ref": sha256Hex(Buffer.from(OBJECT)),
    "x-amz-meta-lawos-sha256": sha256Hex(bytes),
    "x-amz-meta-lawos-byte-size": String(bytes.byteLength),
  };
  const requests = [];
  const server = createHttpsServer({ key: tls.key, cert: tls.cert }, (request, response) => {
    requests.push({ method: request.method, range: request.headers.range ?? null });
    const headers = { "content-length": String(bytes.byteLength), "content-type": "text/plain", ...metadata };
    response.writeHead(request.method === "HEAD" ? 200 : 206, request.method === "HEAD"
      ? headers
      : { ...headers, "content-range": "bytes 0-7/8" });
    response.end(request.method === "HEAD" ? undefined : bytes);
  });
  const port = await listen(server);
  const httpsAgent = new HttpsAgent({ ca: tls.cert, keepAlive: true, maxSockets: 1 });
  const bounded = client(`https://127.0.0.1:${port}`, { httpsAgent });
  t.after(async () => {
    bounded.destroy();
    await close(server);
    rmSync(tls.directory, { force: true, recursive: true });
  });
  const result = await productionAdapter(bounded).readObjectBounded({
    tenant_id: TENANT,
    object_id: OBJECT,
    max_bytes: LIMIT,
  });
  assert.equal(bounded.config.requestHandler.httpHandlerConfigs().httpsAgent, httpsAgent);
  assert.equal(result.sha256, sha256Hex(bytes));
  assert.deepEqual(requests, [
    { method: "HEAD", range: null },
    { method: "GET", range: EXPECTED_RANGE },
  ]);
});
