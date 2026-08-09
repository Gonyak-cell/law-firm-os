import assert from "node:assert/strict";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import { createFileStorageAdapter } from "../src/storage/file-storage-adapter.js";
import { createLocalStorageAdapter } from "../src/storage/local-storage-adapter.js";
import { sha256Hex } from "../src/storage/storage-adapter.js";

const TENANT = "tenant-quarantine-staged";
const OBJECT = "object-quarantine-staged";
const BYTES = Buffer.from("staged copy must not leak after quarantine");

function assertDenied(read) {
  assert.throws(read, (error) => error?.code === "DMS_COMMITTED_OBJECT_QUARANTINED"
    && !error.message.includes(OBJECT)
    && !error.message.includes(BYTES.toString()));
}

async function assertBoundedDenied(storage) {
  await assert.rejects(
    storage.readObjectBounded({ tenant_id: TENANT, object_id: OBJECT, max_bytes: 1024 }),
    (error) => error?.code === "DMS_COMMITTED_OBJECT_QUARANTINED"
      && !error.message.includes(OBJECT)
      && !error.message.includes(BYTES.toString()),
  );
}

async function exerciseStagedReadDeny(storage, { restart } = {}) {
  const digest = sha256Hex(BYTES);
  storage.stageObject({ tenant_id: TENANT, session_id: "committed-session", object_id: OBJECT, bytes: BYTES, expected_sha256: digest });
  storage.finalizeObject({ tenant_id: TENANT, session_id: "committed-session", object_id: OBJECT });
  storage.stageObject({ tenant_id: TENANT, session_id: "preexisting-staged-session", object_id: OBJECT, bytes: BYTES, expected_sha256: digest });
  const record = storage.recordCommittedObjectQuarantine({ tenant_id: TENANT, object_id: OBJECT, expected_sha256: digest, reason: "DMS_TEST_AUTHORITY_DRIFT", audit_trace_id: "audit-quarantine-staged", permission_envelope_id: "permission-quarantine-staged" });
  assert.equal(record.state, "quarantined");
  assertDenied(() => storage.statStagedObject({ tenant_id: TENANT, session_id: "preexisting-staged-session", object_id: OBJECT }));
  assertDenied(() => storage.digestObject({ tenant_id: TENANT, session_id: "preexisting-staged-session", object_id: OBJECT }));
  assertDenied(() => storage.getObject({ tenant_id: TENANT, object_id: OBJECT }));
  await assertBoundedDenied(storage);
  assert.equal(storage.statObject({ tenant_id: TENANT, object_id: OBJECT }), null);
  assertDenied(() => storage.stageObject({ tenant_id: TENANT, session_id: "new-staged-session", object_id: OBJECT, bytes: BYTES }));
  assertDenied(() => storage.finalizeObject({ tenant_id: TENANT, session_id: "preexisting-staged-session", object_id: OBJECT }));
  return restart?.(digest);
}

test("DMS H1 file adapter denies every staged and committed read after durable tombstone across restart", async (t) => {
  const root = mkdtempSync(join(tmpdir(), "dms-quarantine-staged-file-"));
  t.after(() => rmSync(root, { recursive: true, force: true }));
  const objectRoot = join(root, "objects");
  const authorityRoot = join(root, "quarantine-authority");
  const storage = createFileStorageAdapter({ adapter_id: "quarantine-file", rootPath: objectRoot, quarantineRootPath: authorityRoot });
  await exerciseStagedReadDeny(storage, { restart: async (digest) => {
    const reopened = createFileStorageAdapter({ adapter_id: "quarantine-file", rootPath: objectRoot, quarantineRootPath: authorityRoot });
    assertDenied(() => reopened.statStagedObject({ tenant_id: TENANT, session_id: "preexisting-staged-session", object_id: OBJECT }));
    assertDenied(() => reopened.digestObject({ tenant_id: TENANT, session_id: "preexisting-staged-session", object_id: OBJECT }));
    assertDenied(() => reopened.getObject({ tenant_id: TENANT, object_id: OBJECT }));
    await assertBoundedDenied(reopened);
    assert.equal(reopened.statObject({ tenant_id: TENANT, object_id: OBJECT }), null);
    assert.equal(reopened.quarantineCommittedObject({ tenant_id: TENANT, object_id: OBJECT, expected_sha256: digest }).quarantined, true);
    assertDenied(() => reopened.statStagedObject({ tenant_id: TENANT, session_id: "preexisting-staged-session", object_id: OBJECT }));
  } });
});

test("DMS H1 local adapter denies staged digest/stat and supports shared-authority restart readback", async () => {
  const quarantineStore = new Map();
  const storage = createLocalStorageAdapter({ adapter_id: "quarantine-local", quarantineStore });
  await exerciseStagedReadDeny(storage, { restart: async (digest) => {
    const reopened = createLocalStorageAdapter({ adapter_id: "quarantine-local", quarantineStore });
    assertDenied(() => reopened.statStagedObject({ tenant_id: TENANT, session_id: "preexisting-staged-session", object_id: OBJECT }));
    assertDenied(() => reopened.digestObject({ tenant_id: TENANT, session_id: "preexisting-staged-session", object_id: OBJECT }));
    assertDenied(() => reopened.getObject({ tenant_id: TENANT, object_id: OBJECT }));
    await assertBoundedDenied(reopened);
    assert.equal(reopened.statObject({ tenant_id: TENANT, object_id: OBJECT }), null);
    assert.equal(reopened.getCommittedObjectQuarantine({ tenant_id: TENANT, object_id: OBJECT }).state, "quarantined");
    assert.equal(reopened.quarantineCommittedObject({ tenant_id: TENANT, object_id: OBJECT, expected_sha256: digest }).quarantined, false);
  } });
});
