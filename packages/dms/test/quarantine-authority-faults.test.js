import assert from "node:assert/strict";
import { chmodSync, existsSync, mkdtempSync, readFileSync, readdirSync, rmSync } from "node:fs";
import { createHash } from "node:crypto";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import { uploadDocument } from "../src/document-service.js";
import { createDmsRepository } from "../src/repository.js";
import { createFileStorageAdapter } from "../src/storage/file-storage-adapter.js";

const TENANT = "tenant-quarantine-authority";
const MATTER = "matter-quarantine-authority";
const DOCUMENT = Object.freeze({ document_id: "document-quarantine-authority", tenant_id: TENANT, matter_id: MATTER, workspace_id: "workspace-quarantine-authority", title: "Authority quarantine", current_version_id: "version-quarantine-authority", permission_envelope_id: "permission-quarantine-authority", audit_trace_id: "audit-quarantine-authority", mime_type: "application/pdf" });
const BYTES = Buffer.from("authority quarantine bytes");
const DIGEST = createHash("sha256").update(BYTES).digest("hex");

function uploadArgs(repository, storage, beforePersist) {
  return { repository, storage, document: DOCUMENT, bytes: BYTES, actor_id: "actor-quarantine-authority", idempotency_key: "idempotency-quarantine-authority", beforePersist };
}

function counts(repository) {
  return [
    repository.list({ tenant_id: TENANT, model_type: "DmsFileObject" }).length,
    repository.list({ tenant_id: TENANT, model_type: "DmsDocumentVersion" }).length,
    repository.list({ tenant_id: TENANT, model_type: "DmsDocument" }).length,
    repository.listAudit({ tenant_id: TENANT }).length,
    repository.getIdempotency({ tenant_id: TENANT, idempotency_key: "idempotency-quarantine-authority" }) ?? null,
  ];
}

test("DMS H2 real object-root chmod keeps bytes unreadable via independent deny authority and converges after restart", async (t) => {
  const root = mkdtempSync(join(tmpdir(), "dms-quarantine-chmod-"));
  t.after(() => {
    chmodSync(join(root, "objects"), 0o700);
    rmSync(root, { recursive: true, force: true });
  });
  const objectRoot = join(root, "objects");
  const quarantineRoot = join(root, "quarantine-authority");
  const storage = createFileStorageAdapter({ adapter_id: "chmod-file", rootPath: objectRoot, quarantineRootPath: quarantineRoot });
  const repository = createDmsRepository();
  let objectId;
  assert.throws(() => uploadDocument(uploadArgs(repository, storage, ({ phase, receipt }) => {
    if (phase !== "after_storage") return;
    objectId = receipt.object_id;
    chmodSync(objectRoot, 0o500);
    throw Object.assign(new Error("authority changed after storage"), { safe_error_code: "DMS_TEST_AUTHORITY_CHANGED" });
  })), (error) => error?.safe_error_code === "DMS_TEST_AUTHORITY_CHANGED"
    && error?.cleanup_state === "durably_quarantined"
    && typeof error?.cleanup_record_ref === "string");
  const rawBytes = readdirSync(objectRoot).find((name) => name.endsWith(".bin"));
  assert.ok(rawBytes);
  assert.deepEqual(readFileSync(join(objectRoot, rawBytes)), BYTES);
  assert.equal(storage.statObject({ tenant_id: TENANT, object_id: objectId }), null);
  assert.throws(() => storage.getObject({ tenant_id: TENANT, object_id: objectId }), (error) => error?.code === "DMS_COMMITTED_OBJECT_QUARANTINED");
  const record = storage.getCommittedObjectQuarantine({ tenant_id: TENANT, object_id: objectId });
  assert.deepEqual([record.state, record.tenant_id, record.object_id, record.expected_sha256, record.permission_envelope_id, record.audit_trace_id], ["quarantined", TENANT, objectId, DIGEST, DOCUMENT.permission_envelope_id, DOCUMENT.audit_trace_id]);
  assert.deepEqual(counts(repository), [0, 0, 0, 0, null]);
  chmodSync(objectRoot, 0o700);
  const restarted = createFileStorageAdapter({ adapter_id: "chmod-file", rootPath: objectRoot, quarantineRootPath: quarantineRoot });
  assert.equal(restarted.getCommittedObjectQuarantine({ tenant_id: TENANT, object_id: objectId }).record_ref, record.record_ref);
  assert.throws(() => restarted.getObject({ tenant_id: TENANT, object_id: objectId }), (error) => error?.code === "DMS_COMMITTED_OBJECT_QUARANTINED");
  assert.equal(restarted.quarantineCommittedObject({ tenant_id: TENANT, object_id: objectId, expected_sha256: DIGEST }).quarantined, true);
  assert.equal(existsSync(join(objectRoot, rawBytes)), false);
  assert.throws(() => restarted.getObject({ tenant_id: TENANT, object_id: objectId }), (error) => error?.code === "DMS_COMMITTED_OBJECT_QUARANTINED");
});

test("DMS H2 unavailable independent quarantine authority fails before storage and metadata", (t) => {
  const root = mkdtempSync(join(tmpdir(), "dms-quarantine-authority-unavailable-"));
  t.after(() => {
    chmodSync(join(root, "quarantine-authority"), 0o700);
    rmSync(root, { recursive: true, force: true });
  });
  const objectRoot = join(root, "objects");
  const quarantineRoot = join(root, "quarantine-authority");
  const base = createFileStorageAdapter({ adapter_id: "authority-unavailable", rootPath: objectRoot, quarantineRootPath: quarantineRoot });
  chmodSync(quarantineRoot, 0o500);
  let putCalls = 0;
  const storage = Object.freeze({ ...base, putObject(input) { putCalls += 1; return base.putObject(input); } });
  const repository = createDmsRepository();
  assert.throws(() => uploadDocument(uploadArgs(repository, storage, () => {})), (error) => error?.safe_error_code === "DMS_QUARANTINE_AUTHORITY_UNAVAILABLE");
  assert.equal(putCalls, 0);
  assert.deepEqual(counts(repository), [0, 0, 0, 0, null]);
});

test("DMS H2 deny-intent write failure cannot reach storage or report success", () => {
  const root = mkdtempSync(join(tmpdir(), "dms-quarantine-arm-failure-"));
  try {
    const base = createFileStorageAdapter({ adapter_id: "arm-failure", rootPath: join(root, "objects"), quarantineRootPath: join(root, "quarantine-authority") });
    let putCalls = 0;
    const storage = Object.freeze({ ...base, armCommittedObjectQuarantine() { throw Object.assign(new Error("deny intent write unavailable"), { safe_error_code: "DMS_TEST_QUARANTINE_ARM_UNAVAILABLE" }); }, putObject(input) { putCalls += 1; return base.putObject(input); } });
    const repository = createDmsRepository();
    assert.throws(() => uploadDocument(uploadArgs(repository, storage, () => {})), (error) => error?.safe_error_code === "DMS_TEST_QUARANTINE_ARM_UNAVAILABLE");
    assert.equal(putCalls, 0);
    assert.deepEqual(counts(repository), [0, 0, 0, 0, null]);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test("DMS H2 deny-intent clear failure leaves committed metadata inaccessible and converges", () => {
  const root = mkdtempSync(join(tmpdir(), "dms-quarantine-clear-failure-"));
  try {
    const objectRoot = join(root, "objects");
    const quarantineRoot = join(root, "quarantine-authority");
    const base = createFileStorageAdapter({ adapter_id: "clear-failure", rootPath: objectRoot, quarantineRootPath: quarantineRoot });
    const storage = Object.freeze({ ...base, clearCommittedObjectQuarantine() { throw Object.assign(new Error("deny intent clear unavailable"), { safe_error_code: "DMS_TEST_QUARANTINE_CLEAR_UNAVAILABLE" }); } });
    const repository = createDmsRepository();
    assert.throws(() => uploadDocument(uploadArgs(repository, storage, () => {})), (error) => error?.safe_error_code === "DMS_COMMITTED_QUARANTINE_CLEAR_FAILED" && error?.metadata_state === "committed");
    const objectId = `vault:${TENANT}:${MATTER}:document-quarantine-authority:version-quarantine-authority`;
    assert.throws(() => storage.getObject({ tenant_id: TENANT, object_id: objectId }), (error) => error?.code === "DMS_COMMITTED_OBJECT_QUARANTINED");
    assert.deepEqual([repository.list({ tenant_id: TENANT, model_type: "DmsFileObject" }).length, repository.listAudit({ tenant_id: TENANT }).length, Boolean(repository.getIdempotency({ tenant_id: TENANT, idempotency_key: "idempotency-quarantine-authority" }))], [1, 1, true]);
    const reconciled = base.quarantineCommittedObject({ tenant_id: TENANT, object_id: objectId, expected_sha256: DIGEST });
    assert.equal(reconciled.quarantined, true);
    assert.throws(() => base.getObject({ tenant_id: TENANT, object_id: objectId }), (error) => error?.code === "DMS_COMMITTED_OBJECT_QUARANTINED");
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test("DMS H2 cleanup tombstone write failure keeps the pre-armed object denied and retry-safe", () => {
  const root = mkdtempSync(join(tmpdir(), "dms-quarantine-record-failure-"));
  try {
    const objectRoot = join(root, "objects");
    const quarantineRoot = join(root, "quarantine-authority");
    const base = createFileStorageAdapter({ adapter_id: "record-failure", rootPath: objectRoot, quarantineRootPath: quarantineRoot });
    const storage = Object.freeze({
      ...base,
      deleteCommittedObject() {
        throw Object.assign(new Error("committed delete unavailable"), { safe_error_code: "DMS_TEST_COMMITTED_DELETE_UNAVAILABLE" });
      },
      quarantineCommittedObject() {
        throw Object.assign(new Error("committed quarantine unavailable"), { safe_error_code: "DMS_TEST_COMMITTED_QUARANTINE_UNAVAILABLE" });
      },
      recordCommittedObjectQuarantine() {
        throw Object.assign(new Error("tombstone write unavailable"), { safe_error_code: "DMS_TEST_TOMBSTONE_WRITE_UNAVAILABLE" });
      },
    });
    const repository = createDmsRepository();
    assert.throws(() => uploadDocument(uploadArgs(repository, storage, ({ phase }) => {
      if (phase === "after_storage") throw Object.assign(new Error("authority changed after storage"), { safe_error_code: "DMS_TEST_AUTHORITY_CHANGED" });
    })), (error) => error?.safe_error_code === "DMS_TEST_AUTHORITY_CHANGED"
      && error?.cleanup_state === "pending"
      && error?.cleanup_error_code === "DMS_TEST_TOMBSTONE_WRITE_UNAVAILABLE"
      && error?.cleanup_record_ref === null);
    const objectId = `vault:${TENANT}:${MATTER}:document-quarantine-authority:version-quarantine-authority`;
    assert.throws(() => storage.getObject({ tenant_id: TENANT, object_id: objectId }), (error) => error?.code === "DMS_COMMITTED_OBJECT_QUARANTINED");
    assert.equal(storage.getCommittedObjectQuarantine({ tenant_id: TENANT, object_id: objectId }).state, "armed");
    assert.deepEqual(counts(repository), [0, 0, 0, 0, null]);
    const converged = base.quarantineCommittedObject({ tenant_id: TENANT, object_id: objectId, expected_sha256: DIGEST });
    assert.equal(converged.quarantined, true);
    assert.throws(() => base.getObject({ tenant_id: TENANT, object_id: objectId }), (error) => error?.code === "DMS_COMMITTED_OBJECT_QUARANTINED");
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});
