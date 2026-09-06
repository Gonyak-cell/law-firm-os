import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import test from "node:test";
import { createDmsAuxiliaryRepository } from "../../../packages/dms/src/central-ledger.js";
import { createLocalStorageAdapter } from "../../../packages/dms/src/storage/local-storage-adapter.js";
import { handleNativeCorporateExportApiRequest, NATIVE_CORPORATE_EXPORT_CHUNK_BYTES as CHUNK,
  NATIVE_CORPORATE_EXPORT_PREFIX as PREFIX } from "../src/native-corporate-export-runtime.js";

const TENANT = "tenant-native-corporate";
const OWNER = "user-native-owner";
const WORKSPACE = "workspace-native-corporate";
const NOW = Date.parse("2026-09-06T13:00:00.000Z");
const sha = (bytes) => createHash("sha256").update(bytes).digest("hex");

function fixture(t, { bytes = Buffer.from("Synthetic corporate source") } = {}) {
  let clock = NOW;
  let reads = 0;
  let requestIndex = 0;
  let allow = true;
  const workspace = { model_type: "DmsWorkspace", tenant_id: TENANT, workspace_id: WORKSPACE,
    matter_id: null, name: "Synthetic corporate workspace", scope_type: "legal_entity_administration",
    legal_entity_id: "entity-native", organization_id: "organization-native", party_id: "party-native",
    owner_user_id: OWNER, permission_envelope_id: "permission-native", permission_ref: "permission-ref-native",
    audit_trace_id: "audit-native", synthetic_only: false, client_visible_by_default: false, status: "active" };
  const repository = createDmsAuxiliaryRepository({ seedRecords: [workspace], preserveSeedRecords: true });
  t.after(() => repository.close());
  const storage = createLocalStorageAdapter({ adapter_id: "native-corporate-test" });
  const stored = storage.putObject({ tenant_id: TENANT, object_id: "object-native", bytes, content_type: "application/pdf" });
  const exactVersion = { document_id: "document-native", version_id: "version-native", file_object_id: "file-native",
    sha256: stored.sha256, byte_size: bytes.length, mime_type: "application/pdf" };
  const state = {
    document: { tenant_id: TENANT, document_id: exactVersion.document_id, matter_id: null, workspace_id: WORKSPACE,
      status: "active", current_version_id: exactVersion.version_id, permission_envelope_id: workspace.permission_envelope_id },
    versions: [{ tenant_id: TENANT, document_id: exactVersion.document_id, version_id: exactVersion.version_id,
      file_object_id: exactVersion.file_object_id, sha256: stored.sha256 }],
    file_objects: [{ tenant_id: TENANT, file_object_id: exactVersion.file_object_id, object_id: stored.object_id,
      status: "committed", sha256: stored.sha256, byte_size: bytes.length, content_type: "application/pdf" }],
  };
  const principal = { tenant_id: TENANT, user_id: OWNER, scopes: ["vault.read"] };
  const context = { principal, rules: [{ id: "vault-read", effect: "allow", action: "dms:document:download" }],
    object_acl: [], object_acl_authority: { status: "authoritative" } };
  const runtime = { authority: "postgres-v2", repository,
    storage: { ...storage, async readObjectBounded(input) { reads++; return storage.readObjectBounded(input); } },
    upload_runtime: { source_only: false, async getDocumentState() { return structuredClone(state); } } };
  const call = (action, body, options = {}) => handleNativeCorporateExportApiRequest({
    pathname: `${PREFIX}${action}`, body, requestId: `req-native-${++requestIndex}`, principal, context,
    sessionAuth: { async resolveVaultCapabilities() { return { authoritative: allow, capabilities: [{ id: "download", allowed: allow }] }; } },
    dmsRuntime: runtime, now: () => clock, ...options,
  });
  const target = { workspace_id: WORKSPACE, exact_version: exactVersion };
  const authorize = (nonce = "a".repeat(64)) => call("authorize", { ...target, request_nonce_sha256: nonce });
  const chunk = (id, offset = 0) => call("chunk", { operation_id: id, offset }, { headers: { "idempotency-key": `${id}:${offset}` } });
  const complete = (id) => call("complete", { operation_id: id, exact_version: exactVersion }, { headers: { "idempotency-key": id } });
  return { repository, runtime, principal, context, workspace, state, bytes, exactVersion, target, call, authorize, chunk, complete,
    reads: () => reads, setNow: (value) => { clock = value; }, denyCapability: () => { allow = false; } };
}

test("native corporate export binds an exact version, transfers bounded chunks, and completes only once", async (t) => {
  const f = fixture(t, { bytes: Buffer.alloc(CHUNK + 17, 0x5a) });
  const preflight = await f.call("preflight", f.target);
  assert.equal(preflight.status, 200, JSON.stringify(preflight.body));
  assert.equal(f.reads(), 0);
  assert.equal(f.repository.snapshot().idempotency.length, 0);
  const authorized = await f.authorize();
  assert.equal(authorized.status, 200, JSON.stringify(authorized.body));
  const id = authorized.body.operation_id;
  const beforeReplay = f.repository.snapshot();
  assert.equal((await f.authorize()).body.operation_id, id);
  assert.deepEqual(f.repository.snapshot(), beforeReplay);
  assert.equal((await f.complete(id)).status, 409);
  assert.equal((await f.chunk(id, CHUNK)).status, 409);
  assert.equal(f.reads(), 0);
  const first = await f.chunk(id);
  assert.equal(first.status, 200, JSON.stringify(first.body));
  assert.equal(first.body.next_offset, CHUNK);
  assert.equal(first.body.final_chunk, false);
  assert.ok(Buffer.byteLength(JSON.stringify(first.body)) < 6 * 1024 * 1024);
  const beforeChunkReplay = f.repository.snapshot();
  assert.deepEqual((await f.chunk(id)).body.chunk, first.body.chunk);
  assert.deepEqual(f.repository.snapshot(), beforeChunkReplay);
  const last = await f.chunk(id, CHUNK);
  assert.equal(last.status, 200, JSON.stringify(last.body));
  assert.equal(last.body.chunk.byte_size, 17);
  assert.equal(last.body.final_chunk, true);
  const received = [first, last].map((r) => {
    const bytes = Buffer.from(r.body.chunk.content_base64, "base64");
    assert.equal(sha(bytes), r.body.chunk.sha256);
    return bytes;
  });
  assert.deepEqual(Buffer.concat(received), f.bytes);
  const complete = await f.complete(id);
  assert.equal(complete.status, 200, JSON.stringify(complete.body));
  assert.equal(complete.body.stage, "delivered");
  const finished = f.repository.snapshot();
  assert.equal((await f.complete(id)).status, 200);
  assert.deepEqual(f.repository.snapshot(), finished);
  assert.equal(finished.idempotency.length, 4);
  assert.equal((await f.chunk(id)).status, 409);
  assert.equal(f.repository.snapshot().records.length, 1);
  const auditText = JSON.stringify(f.repository.snapshot().audit_events);
  assert.equal(auditText.includes("content_base64"), false);
  assert.equal(auditText.includes(f.bytes.subarray(0, 32).toString("base64")), false);
});

test("native corporate permission and current-version boundaries deny before storage I/O", async (t) => {
  const f = fixture(t);
  const id = (await f.authorize()).body.operation_id;
  const original = structuredClone(f.state);
  for (const patch of [{ matter_id: "matter-not-corporate" }, { workspace_id: "workspace-other" },
    { tenant_id: "tenant-other" }, { permission_envelope_id: "permission-other" }, { status: "deleted" },
    { current_version_id: "version-new" }]) {
    Object.assign(f.state.document, patch);
    const denied = await f.chunk(id);
    assert.ok([403, 409].includes(denied.status), JSON.stringify(denied.body));
    Object.assign(f.state.document, original.document);
  }
  f.context.object_acl = [{ id: "deny-owner", tenant_id: TENANT, principal_id: OWNER,
    resource_type: "DmsDocument", resource_id: f.exactVersion.document_id, effect: "deny", action: "*" }];
  assert.equal((await f.chunk(id)).status, 403);
  f.context.object_acl = [];
  f.context.object_acl_authority.status = "unavailable";
  assert.equal((await f.chunk(id)).status, 403);
  f.context.object_acl_authority.status = "authoritative";
  f.denyCapability();
  assert.equal((await f.chunk(id)).status, 403);
  assert.equal(f.reads(), 0);
});

test("native export rejects forged authority, invalid offsets, missing scope and expired state", async (t) => {
  const f = fixture(t);
  for (const fields of [{ tenant_id: TENANT }, { actor_id: OWNER }, { matter_id: "matter-fake" },
    { storage_url: "https://example.test/object" }, { exact_version: { ...f.exactVersion, byte_size: 26 * 1024 * 1024 } }]) {
    assert.notEqual((await f.call("preflight", { ...f.target, ...fields })).status, 200);
  }
  const id = (await f.authorize()).body.operation_id;
  for (const offset of [-1, 1, 0.5, Number.MAX_SAFE_INTEGER, "0", null]) {
    assert.equal((await f.chunk(id, offset)).status, 400);
  }
  assert.equal((await f.call("chunk", { operation_id: id, offset: 0 })).status, 409);
  assert.equal((await f.call("chunk", { operation_id: id, offset: 0 }, {
    principal: { ...f.principal, user_id: "user-other" }, headers: { "idempotency-key": `${id}:0` },
  })).status, 403);
  f.setNow(NOW + 5 * 60 * 1000);
  assert.equal((await f.chunk(id)).status, 409);
  assert.equal((await f.authorize()).status, 409);
  assert.equal(f.reads(), 0);
});

test("tampered provider bodies and expiry during read cannot produce a chunk receipt", async (t) => {
  const f = fixture(t);
  const id = (await f.authorize()).body.operation_id;
  const read = f.runtime.storage.readObjectBounded;
  f.runtime.storage.readObjectBounded = async (input) => {
    const object = await read(input);
    return { ...object, bytes: Buffer.alloc(object.byte_size, 0) };
  };
  assert.equal((await f.chunk(id)).status, 409);
  assert.equal(f.repository.snapshot().idempotency.length, 1);
  f.runtime.storage.readObjectBounded = async (input) => {
    const object = await read(input);
    f.setNow(NOW + 5 * 60 * 1000);
    return object;
  };
  assert.equal((await f.chunk(id)).status, 409);
  assert.equal(f.repository.snapshot().idempotency.length, 1);
});

test("audit failure rolls back a new native export authorization in the repository transaction", async (t) => {
  const f = fixture(t);
  f.runtime.repository = { ...f.repository, appendAudit(event) {
    if (event.decision === "allow") throw new Error("synthetic audit failure");
    return f.repository.appendAudit(event);
  } };
  assert.equal((await f.authorize()).status, 503);
  assert.equal(f.repository.snapshot().idempotency.length, 0);
  assert.equal(f.repository.snapshot().audit_events.filter((event) => event.decision === "allow").length, 0);
});
