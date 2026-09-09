import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import test from "node:test";
import { createDmsAuxiliaryRepository } from "../../../packages/dms/src/central-ledger.js";
import { createLocalStorageAdapter } from "../../../packages/dms/src/storage/local-storage-adapter.js";
import { handleNativeMatterExportApiRequest, NATIVE_MATTER_EXPORT_MAX_BYTES as MAX } from "../src/native-matter-export-runtime.js";
import { createDesktopFileBridgePermissionClient } from "../../desktop/src/main/main.js";

const NOW = Date.parse("2026-09-09T00:00:00.000Z");
const TENANT = "tenant-native-export";
const USER = "user-native-export";
const MATTER = "matter-native-export";
const sha = (value) => createHash("sha256").update(value).digest("hex");

function fixture(t, bytes = Buffer.from("Synthetic native Matter contract")) {
  let now = NOW;
  let reads = 0;
  let count = 0;
  const repository = createDmsAuxiliaryRepository();
  t.after(() => repository.close());
  const storage = createLocalStorageAdapter({ adapter_id: "synthetic-native-export" });
  const object = storage.putObject({ tenant_id: TENANT, object_id: "object-native-export", bytes, content_type: "application/pdf" });
  const exact = { document_id: "document-native-export", version_id: "version-native-export", file_object_id: "file-native-export",
    sha256: sha(bytes), byte_size: bytes.length, mime_type: "application/pdf" };
  const document = { tenant_id: TENANT, document_id: exact.document_id, matter_id: MATTER, status: "active",
    workspace_id: "workspace-native-export", current_version_id: exact.version_id, title: "Synthetic contract.pdf" };
  const state = { document, versions: [{ tenant_id: TENANT, document_id: exact.document_id, version_id: exact.version_id,
    file_object_id: exact.file_object_id, sha256: exact.sha256 }], file_objects: [{ tenant_id: TENANT,
    file_object_id: exact.file_object_id, object_id: object.object_id, sha256: exact.sha256,
    byte_size: bytes.length, content_type: exact.mime_type, status: "committed" }] };
  const principal = { tenant_id: TENANT, user_id: USER, scopes: ["vault.read"] };
  const context = { principal, rules: ["vault:download:preflight", "dms:document:read", "dms:document:download"]
    .map((action) => ({ id: action, action, effect: "allow" })), object_acl: [], object_acl_authority: { status: "authoritative" } };
  const capabilities = [{ id: "download", allowed: true }, { id: "attach", allowed: true }];
  const matter = { matter_id: MATTER, tenant_id: TENANT, status: "open" };
  const runtime = { authority: "postgres-v2", repository,
    storage: { async readObjectBounded(input) { reads++; return storage.readObjectBounded(input); } },
    upload_runtime: { source_only: false, async getDocumentState() { return structuredClone(state); } } };
  const target = { matter_id: MATTER, exact_version: exact };
  const binding = { operation_kind: "attach_outlook", installation_ref_sha256: "b".repeat(64), compose_target_sha256: "c".repeat(64) };
  const call = (action, body, overrides = {}) => handleNativeMatterExportApiRequest({
    pathname: `/api/vault/desktop/export-${action}`, body, principal, context, requestId: `req-native-export-${++count}`,
    sessionAuth: { resolveVaultCapabilities: async () => ({ authoritative: true, capabilities }) },
    matterRuntime: { repository: { list: () => [matter] } }, dmsRuntime: runtime, now: () => now, ...overrides });
  const authorize = (patch = {}) => call("authorize", { ...target, ...binding, request_nonce_sha256: "a".repeat(64), ...patch });
  const download = (id, overrides = {}) => call("download", { operation_id: id }, { headers: { "idempotency-key": id }, ...overrides });
  const complete = (id, patch = {}) => call("complete", { operation_id: id, exact_version: exact, ...binding, ...patch },
    { headers: { "idempotency-key": id } });
  return { repository, runtime, state, matter, principal, context, capabilities, exact, binding, bytes, target,
    call, authorize, download, complete, reads: () => reads, setNow: (value) => { now = value; } };
}

test("native preflight satisfies the installed desktop permission adapter before attachment", async (t) => {
  const f = fixture(t);
  const permissionClient = createDesktopFileBridgePermissionClient({
    precheckVaultUpload() { throw new Error("Upload must not be invoked"); },
    async precheckVaultExport(input) {
      const response = await f.call("preflight", { matter_id: input.matterId, exact_version: input.exactVersion });
      return { ...response.body, http_status: response.status };
    },
  });
  const request = { actionId: "attach_document_to_classic_outlook", matterId: MATTER, exactVersion: f.exact };
  assert.equal((await permissionClient.precheckFileBridgeAction(request)).allowed, true);
  f.context.object_acl.push({ effect: "deny", principal_id: USER, resource_type: "vault_document",
    resource_id: f.exact.document_id, action: "dms:document:download" });
  assert.equal((await permissionClient.precheckFileBridgeAction(request)).allowed, false);
  assert.equal(f.reads(), 0);
  assert.equal(f.repository.snapshot().idempotency.length, 0);
});

test("native Matter attach binds the existing desktop protocol and consumes bytes only once", async (t) => {
  const f = fixture(t);
  assert.equal((await f.call("preflight", f.target)).status, 200);
  assert.equal(f.repository.snapshot().idempotency.length, 0);
  const authorized = await f.authorize();
  assert.equal(authorized.status, 200, JSON.stringify(authorized.body));
  const id = authorized.body.operation_id;
  assert.equal(authorized.body.operation_kind, "attach_outlook");
  const before = f.repository.snapshot();
  assert.equal((await f.authorize()).body.operation_id, id);
  assert.deepEqual(f.repository.snapshot(), before);
  assert.equal((await f.complete(id)).status, 409);
  assert.equal((await f.authorize({ compose_target_sha256: "d".repeat(64) })).status, 409);
  const downloaded = await f.download(id);
  assert.equal(downloaded.status, 200, JSON.stringify(downloaded.body));
  assert.deepEqual(downloaded.body, f.bytes);
  assert.equal((await f.download(id)).status, 409);
  assert.equal((await f.authorize()).status, 409);
  assert.equal((await f.complete(id, { installation_ref_sha256: "d".repeat(64) })).status, 409);
  assert.equal((await f.complete(id, { exact_version: { ...f.exact, sha256: "d".repeat(64) } })).status, 409);
  assert.equal((await f.complete(id)).body.receipt.stage, "attached");
  const final = f.repository.snapshot();
  assert.equal((await f.complete(id)).body.outcome, "attached");
  assert.deepEqual(f.repository.snapshot(), final);
  assert.equal((await f.complete(id, { completion_stage: "failed", safe_reason_code: "SYNTHETIC_HOST_FAILURE" })).status, 409);
  assert.equal(f.reads(), 1);
  assert.equal(final.idempotency.length, 3);
  assert.equal(final.audit_events.filter((event) => event.decision === "allow").length, 3);
  assert.equal(JSON.stringify(final).includes(f.bytes.toString("base64")), false);
  assert.equal(JSON.stringify(final).includes("object-native-export"), false);
});

test("capability, document ACL, Matter wall, tenant and exact version deny before storage", async (t) => {
  const cases = [
    (f) => { f.capabilities[1].allowed = false; },
    (f) => { f.matter.wip_status = "ethical_wall"; },
    (f) => { f.state.document.tenant_id = "tenant-other"; },
    (f) => { f.state.document.matter_id = "matter-other"; },
    (f) => { f.state.document.current_version_id = "version-other"; },
    (f) => { f.state.versions[0].tenant_id = "tenant-other"; },
    (f) => { f.state.file_objects[0].status = "pending"; },
    (f) => { f.context.object_acl.push({ effect: "deny", principal_id: USER, resource_type: "vault_document",
      resource_id: f.exact.document_id, action: "dms:document:download" }); },
  ];
  for (const mutate of cases) {
    const f = fixture(t); mutate(f);
    assert.notEqual((await f.authorize()).status, 200);
    assert.equal(f.reads(), 0);
    assert.equal(f.repository.snapshot().idempotency.length, 0);
  }
});

test("revoked access, wrong user, expiry and tampered bodies never produce a download receipt", async (t) => {
  for (const mode of ["revoked", "user", "expired", "body", "late-expiry", "late-revocation", "late-version"]) {
    const f = fixture(t);
    const id = (await f.authorize()).body.operation_id;
    if (mode === "revoked") f.capabilities[1].allowed = false;
    if (mode === "expired") f.setNow(NOW + 5 * 60 * 1000);
    const read = f.runtime.storage.readObjectBounded;
    if (["body", "late-expiry", "late-revocation", "late-version"].includes(mode)) f.runtime.storage.readObjectBounded = async (input) => {
      const result = await read(input);
      if (mode === "body") return { ...result, bytes: Buffer.alloc(f.bytes.length) };
      if (mode === "late-expiry") f.setNow(NOW + 5 * 60 * 1000);
      if (mode === "late-revocation") f.capabilities[1].allowed = false;
      if (mode === "late-version") f.state.document.current_version_id = "version-replaced";
      return result;
    };
    assert.notEqual((await f.download(id, mode === "user" ? { principal: { ...f.principal, user_id: "user-other" } } : {})).status, 200, mode);
    assert.equal(f.repository.snapshot().idempotency.length, 1, mode);
  }
});

test("binary response size, injected authority and audit failure fail closed", async (t) => {
  const large = fixture(t, Buffer.alloc(MAX + 1));
  assert.equal((await large.authorize()).status, 413);
  assert.equal(large.reads(), 0);
  const f = fixture(t);
  for (const patch of [{ token: "synthetic" }, { operation_kind: "upload" }, { workspace_id: "workspace-other" }, { compose_target_sha256: "bad" }]) {
    assert.notEqual((await f.authorize(patch)).status, 200);
  }
  f.runtime.repository = { ...f.repository, appendAudit() { throw new Error("synthetic audit failure"); } };
  assert.equal((await f.authorize()).status, 503);
  assert.equal(f.repository.snapshot().idempotency.length, 0);
});

test("a host failure is durable and cannot later be relabeled as attached", async (t) => {
  const f = fixture(t);
  const id = (await f.authorize()).body.operation_id;
  assert.equal((await f.download(id)).status, 200);
  assert.equal((await f.complete(id, { completion_stage: "failed", safe_reason_code: "SYNTHETIC_HOST_FAILURE" })).body.outcome, "failed");
  assert.equal((await f.complete(id)).status, 409);
});

test("the largest permitted binary response fits the Lambda envelope", async (t) => {
  const f = fixture(t, Buffer.alloc(MAX, 0x5a));
  const id = (await f.authorize()).body.operation_id;
  const result = await f.download(id);
  assert.equal(result.status, 200);
  assert.deepEqual(result.body, f.bytes);
  assert.ok(Buffer.byteLength(JSON.stringify({ body: result.body.toString("base64"), isBase64Encoded: true,
    statusCode: 200, headers: { "content-type": "application/pdf" } })) + 16 * 1024 < 6 * 1024 * 1024);
});

test("stored binding tampering cannot pass the durable fingerprint", async (t) => {
  const f = fixture(t);
  const id = (await f.authorize()).body.operation_id;
  const stored = f.repository.snapshot().idempotency[0];
  f.repository.recordIdempotency({ ...stored, response: { ...stored.response, attachment_name: "substituted.pdf" } });
  assert.equal((await f.download(id)).status, 409);
  assert.equal(f.reads(), 0);
});

test("ordinary exact-version export uses the same native authority without Outlook binding", async (t) => {
  const f = fixture(t);
  const authorization = await f.call("authorize", { ...f.target, request_nonce_sha256: "e".repeat(64) });
  const id = authorization.body.operation_id;
  assert.equal(authorization.body.operation_kind, "export_exact_version");
  assert.equal((await f.download(id)).status, 200);
  const result = await f.call("complete", { operation_id: id, exact_version: f.exact }, { headers: { "idempotency-key": id } });
  assert.equal(result.body.receipt.stage, "delivered");
});
