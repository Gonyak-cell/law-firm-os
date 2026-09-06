import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import test from "node:test";
import { createMatterVaultAwsRuntimeClient } from "../src/main/aws-runtime.js";

const PREFIX = "/api/vault/desktop/corporate-export-";
const CHUNK = 3 * 1024 * 1024;
const sha = (bytes) => createHash("sha256").update(bytes).digest("hex");
const HEADERS = { "content-type": "application/json", "cache-control": "private, no-store", "x-content-type-options": "nosniff" };

function fixture({ alter = (_, body) => body, response = (body) => new Response(JSON.stringify(body), { headers: HEADERS }), timeout = 5000 } = {}) {
  const bytes = Buffer.alloc(CHUNK + 19, 0x51);
  const exact = { document_id: "document-native", version_id: "version-native", file_object_id: "file-native",
    sha256: sha(bytes), byte_size: bytes.length, mime_type: "application/pdf" };
  const operation = `vaultop_${"a".repeat(32)}`;
  const expires = new Date(Date.now() + 300_000).toISOString();
  const calls = [];
  const common = { ok: true, operation_id: operation, operation_kind: "export_exact_version", workspace_id: "workspace-native",
    exact_version: exact, attachment_name: "synthetic.pdf", expires_at: expires, chunk_bytes: CHUNK };
  const client = createMatterVaultAwsRuntimeClient({ baseUrl: "https://runtime.example.test", requestTimeoutMs: timeout,
    fetchImpl: async (url, init) => {
      const path = new URL(url).pathname;
      const action = path.slice(PREFIX.length);
      const request = JSON.parse(init.body);
      calls.push({ action, request });
      assert.equal(init.redirect, "manual");
      assert.equal(init.cache, "no-store");
      assert.equal(init.headers.authorization, "Bearer lawos_session_v1.synthetic");
      assert.equal(init.headers["accept-encoding"], "identity");
      let body;
      if (action === "preflight") body = { ...common, outcome: "preflight_passed", lawos_permission_checked: true,
        provider_authority_checked: false, provider_grant_created: false };
      if (action === "authorize") {
        assert.equal(Object.hasOwn(request, "matter_id"), false);
        assert.equal(request.workspace_id, "workspace-native");
        assert.match(request.request_nonce_sha256, /^[a-f0-9]{64}$/u);
        body = { ...common, outcome: "export_authorized" };
      }
      if (action === "chunk") {
        assert.equal(init.headers["idempotency-key"], `${operation}:${request.offset}`);
        const part = bytes.subarray(request.offset, Math.min(request.offset + CHUNK, bytes.length));
        body = { ...common, outcome: "chunk_verified", chunk: { offset: request.offset, byte_size: part.length,
          sha256: sha(part), content_base64: part.toString("base64") }, next_offset: request.offset + part.length,
        final_chunk: request.offset + part.length === bytes.length };
      }
      if (action === "complete") body = { ...common, outcome: "delivered", receipt: { stage: "delivered", receipt_id: "receipt-native" } };
      assert.ok(body, path);
      return response(alter(action, body), action);
    } });
  const input = { matterId: null, workspaceId: "workspace-native", exactVersion: exact, sessionToken: "lawos_session_v1.synthetic" };
  return { client, calls, bytes, input };
}

test("native desktop export joins bounded verified chunks and records completion separately", async () => {
  const f = fixture();
  assert.equal((await f.client.precheckVaultExport(f.input)).http_status, 200);
  const result = await f.client.downloadVaultExactVersion(f.input);
  assert.deepEqual(result.bytes, f.bytes);
  assert.deepEqual(f.calls.map((call) => call.action), ["preflight", "authorize", "chunk", "chunk"]);
  assert.deepEqual(f.calls.filter((call) => call.action === "chunk").map((call) => call.request.offset), [0, CHUNK]);
  assert.equal((await f.client.completeVaultExport({ ...f.input, operationId: result.operation_id })).outcome, "delivered");
  for (const method of ["GET", "POST"]) for (const action of ["preflight", "authorize", "chunk", "complete"]) {
    for (const suffix of ["", "/", "?scope=forged"]) {
      assert.equal((await f.client.api({ path: `${PREFIX}${action}${suffix}`, method, body: "{}", sessionToken: f.input.sessionToken })).http_status, 403);
    }
  }
  assert.equal(f.calls.length, 5, "generic renderer API must never reach native export endpoints");
  assert.equal((await f.client.api({ path: "/api/vault/documents/document-native/download", sessionToken: f.input.sessionToken })).http_status, 403);
});

test("native client rejects mixed scope, forged chunk binding, corrupt bytes and truncated transfers", async () => {
  const inputChecks = fixture();
  for (const patch of [{ matterId: "matter-wrong" }, { workspaceId: "" }, { operationKind: "attach_outlook" }]) {
    await assert.rejects(inputChecks.client.downloadVaultExactVersion({ ...inputChecks.input, ...patch }));
  }
  assert.equal(inputChecks.calls.length, 0);
  for (const mutate of [
    (body) => ({ ...body, operation_id: `vaultop_${"b".repeat(32)}` }),
    (body) => ({ ...body, workspace_id: "workspace-other" }),
    (body) => ({ ...body, exact_version: { ...body.exact_version, version_id: "version-other" } }),
    (body) => ({ ...body, next_offset: body.next_offset + 1 }),
    (body) => ({ ...body, final_chunk: !body.final_chunk }),
    (body) => ({ ...body, chunk: { ...body.chunk, offset: 1 } }),
    (body) => ({ ...body, chunk: { ...body.chunk, sha256: "0".repeat(64) } }),
    (body) => ({ ...body, chunk: { ...body.chunk, content_base64: body.chunk.content_base64.slice(4) } }),
    (body) => ({ ...body, raw_path: "/private/forged" }),
    (body) => ({ ...body, expires_at: new Date(0).toISOString() }),
  ]) {
    const f = fixture({ alter: (action, body) => action === "chunk" ? mutate(body) : body });
    await assert.rejects(f.client.downloadVaultExactVersion(f.input));
    assert.deepEqual(f.calls.map((call) => call.action), ["authorize", "chunk"]);
  }
});

test("native client refuses redirects, unbounded or oversized JSON, public caching and stalled responses", async () => {
  for (const response of [
    () => new Response(null, { status: 302, headers: { location: "https://other.example.test" } }),
    () => ({ status: 200, text: async () => "{}" }),
    () => new Response("{}", { headers: { ...HEADERS, "content-length": "999999999" } }),
    () => new Response("x".repeat(16 * 1024 + 1), { headers: HEADERS }),
    (body) => new Response(JSON.stringify(body), { headers: { ...HEADERS, "cache-control": "public, max-age=600" } }),
    (body) => new Response(JSON.stringify(body), { headers: { ...HEADERS, "content-encoding": "gzip" } }),
    () => new Response(new ReadableStream({ start() {} }), { headers: HEADERS }),
  ]) {
    const f = fixture({ response, timeout: 30 });
    await assert.rejects(f.client.downloadVaultExactVersion(f.input));
    assert.equal(f.calls.length, 1);
  }
});
