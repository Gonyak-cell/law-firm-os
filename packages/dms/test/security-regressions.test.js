import assert from "node:assert/strict";
import { mkdtempSync, rmSync, symlinkSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import { createDmsRepository } from "../src/repository.js";
import { createFileStorageAdapter } from "../src/storage/file-storage-adapter.js";
import { createLocalStorageAdapter } from "../src/storage/local-storage-adapter.js";
import { sha256Hex } from "../src/storage/storage-adapter.js";

const TENANT_A = "tenant-security-a";
const TENANT_B = "tenant-security-b";
const SESSION = "same-session";
const OBJECT = "same-object";

function assertTenantSeparatedStorage(storage) {
  const bytesA = Buffer.from("tenant A bytes");
  const bytesB = Buffer.from("tenant B bytes");
  for (const [tenant_id, bytes] of [[TENANT_A, bytesA], [TENANT_B, bytesB]]) {
    storage.stageObject({ tenant_id, session_id: SESSION, object_id: OBJECT, bytes, expected_sha256: sha256Hex(bytes) });
    storage.finalizeObject({ tenant_id, session_id: SESSION, object_id: OBJECT });
  }
  assert.equal(storage.getObject({ tenant_id: TENANT_A, object_id: OBJECT }).bytes.toString(), bytesA.toString());
  assert.equal(storage.getObject({ tenant_id: TENANT_B, object_id: OBJECT }).bytes.toString(), bytesB.toString());
  assert.notEqual(
    storage.statObject({ tenant_id: TENANT_A, object_id: OBJECT }).storage_pointer_ref,
    storage.statObject({ tenant_id: TENANT_B, object_id: OBJECT }).storage_pointer_ref,
  );
  assert.throws(() => storage.getObject({ object_id: OBJECT }), /tenant_id is required/);
  assert.throws(() => storage.getObject({ tenant_id: "../tenant", object_id: OBJECT }), /tenant_id/);
}

test("DMS-01 local and file adapters isolate identical session/object IDs by tenant", () => {
  assertTenantSeparatedStorage(createLocalStorageAdapter({ adapter_id: "tenant-local" }));
  const rootPath = mkdtempSync(join(tmpdir(), "lawos-dms-tenant-file-"));
  try {
    assertTenantSeparatedStorage(createFileStorageAdapter({ adapter_id: "tenant-file", rootPath }));
  } finally {
    rmSync(rootPath, { recursive: true, force: true });
  }
});

test("DMS-01/DMS-03 committed deletion is tenant-qualified and digest-conditional", () => {
  const storage = createLocalStorageAdapter({ adapter_id: "conditional-delete" });
  const bytes = Buffer.from("conditional bytes");
  const receipt = storage.putObject({ tenant_id: TENANT_A, object_id: OBJECT, bytes });
  assert.throws(
    () => storage.deleteCommittedObject({ tenant_id: TENANT_A, object_id: OBJECT, expected_sha256: "0".repeat(64) }),
    (error) => error?.code === "DMS_COMMITTED_DELETE_CONDITION_FAILED",
  );
  assert.equal(storage.getObject({ tenant_id: TENANT_A, object_id: OBJECT }).sha256, receipt.sha256);
  assert.equal(storage.deleteCommittedObject({ tenant_id: TENANT_A, object_id: OBJECT, expected_sha256: receipt.sha256 }).deleted, true);
  assert.equal(storage.statObject({ tenant_id: TENANT_A, object_id: OBJECT }), null);
});

test("DMS-09 file adapter rejects a symlink storage root", () => {
  const parent = mkdtempSync(join(tmpdir(), "lawos-dms-symlink-parent-"));
  const target = mkdtempSync(join(tmpdir(), "lawos-dms-symlink-target-"));
  const rootPath = join(parent, "vault");
  try {
    symlinkSync(target, rootPath, "dir");
    assert.throws(() => createFileStorageAdapter({ rootPath }), /symlink/);
  } finally {
    rmSync(parent, { recursive: true, force: true });
    rmSync(target, { recursive: true, force: true });
  }
});

function safeFileObject(extra = {}) {
  return {
    model_type: "DmsFileObject",
    tenant_id: TENANT_A,
    matter_id: "matter-security",
    file_object_id: `file-${Math.random()}`,
    storage_pointer_ref: "vault://safe/ref",
    sha256: "a".repeat(64),
    byte_size: 1,
    mime_type: "application/octet-stream",
    permission_envelope_id: "permission-security",
    audit_trace_id: "trace-security",
    ...extra,
  };
}

test("DMS-04 repository rejects normalized secret/raw-byte names and binary containers before persistence", () => {
  const attacks = [
    { api_key: "secret" },
    { Authorization: "Bearer secret" },
    { documentBytes: "secret" },
    { "private-key": "secret" },
    { payload_sample: "secret" },
    { nested: { bytes: Buffer.from("secret") } },
    { nested: { typed: new Uint8Array([1, 2, 3]) } },
    { nested: { raw: new ArrayBuffer(8) } },
    { harmless_extra: Buffer.alloc(192, 1).toString("base64") },
  ];
  for (const attack of attacks) {
    const repository = createDmsRepository();
    assert.throws(
      () => repository.create(safeFileObject(attack)),
      (error) => error?.safe_error_code === "DMS_PERSISTED_SECRET_REJECTED",
    );
    assert.equal(repository.snapshot().records.length, 0);
    repository.close();
  }
});

test("DMS-04 repository projects known record schemas instead of preserving arbitrary extras", () => {
  const repository = createDmsRepository();
  const stored = repository.create(safeFileObject({ harmless_extra: "must-not-persist" }));
  assert.equal(Object.hasOwn(stored, "harmless_extra"), false);
  assert.equal(Object.hasOwn(repository.snapshot().records[0], "harmless_extra"), false);
  repository.close();
});
