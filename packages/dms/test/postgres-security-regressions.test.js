import assert from "node:assert/strict";
import test from "node:test";
import { createMigratedPostgresFixture } from "../../persistence/test/helpers/disposable-postgres.js";
import { createPostgresDmsUploadRuntime } from "../src/postgres-upload-runtime.js";
import { createLocalStorageAdapter } from "../src/storage/local-storage-adapter.js";
import {
  DMS_STORAGE_ADAPTER_CONTRACT_VERSION,
  createStagingReceipt,
  createStorageReceipt,
  sha256Hex,
} from "../src/storage/storage-adapter.js";

const TENANT = "tenant-dms-security";
const BYTES = Buffer.from("DMS security regression bytes");
const NOW = "2026-07-17T06:00:00.000Z";

function input(prefix, overrides = {}) {
  return {
    tenant_id: TENANT,
    session_id: `session-${prefix}`,
    idempotency_key: `idempotency-${prefix}`,
    matter_id: `matter-${prefix}`,
    workspace_id: `workspace-${prefix}`,
    document_id: `document-${prefix}`,
    version_id: `version-${prefix}`,
    version_number: 1,
    object_id: `object-${prefix}`,
    title: `Document ${prefix}`,
    content_type: "text/plain",
    expected_sha256: sha256Hex(BYTES),
    expected_byte_size: BYTES.byteLength,
    permission_envelope_id: `permission-${prefix}`,
    audit_trace_id: `audit-${prefix}`,
    actor_id: "security-test",
    expires_at: "2026-07-18T00:00:00.000Z",
    ...overrides,
  };
}

async function upload(runtime, storage, prefix, overrides = {}) {
  const session = input(prefix, { adapter_id: storage.adapter_id, ...overrides });
  await runtime.createUploadSession(session);
  await runtime.stageUpload({ tenant_id: TENANT, session_id: session.session_id, bytes: BYTES });
  await runtime.finalizeUpload({ tenant_id: TENANT, session_id: session.session_id });
  return session;
}

test("DMS-02 canonical object authority rejects a held-object/unprotected-document confused deputy", async (t) => {
  const fixture = await createMigratedPostgresFixture(t);
  if (!fixture) return;
  const storage = createLocalStorageAdapter({ adapter_id: "canonical-authority" });
  const runtime = createPostgresDmsUploadRuntime({ pool: fixture.appPool, storage, clock: () => new Date(NOW) });
  const held = await upload(runtime, storage, "held-a");
  const unprotected = await upload(runtime, storage, "unprotected-b");
  await runtime.placeLegalHold({
    tenant_id: TENANT,
    legal_hold_id: "hold-security-a",
    document_id: held.document_id,
    object_id: held.object_id,
    created_by: "legal-admin",
    reason: "active litigation",
  });
  const heldState = await runtime.getDocumentState({ tenant_id: TENANT, document_id: held.document_id });
  assert.equal(heldState.document.legal_hold_status, "active");
  await assert.rejects(
    runtime.assertCommittedObjectDeleteAllowed({ tenant_id: TENANT, document_id: unprotected.document_id, object_id: held.object_id }),
    (error) => error?.safe_error_code === "DMS_DOCUMENT_OBJECT_MISMATCH",
  );
  await assert.rejects(
    runtime.placeLegalHold({ tenant_id: TENANT, legal_hold_id: "hold-mismatch", document_id: unprotected.document_id, object_id: held.object_id, created_by: "legal-admin", reason: "mismatch" }),
    (error) => error?.safe_error_code === "DMS_DOCUMENT_OBJECT_MISMATCH",
  );
});

test("DMS-07 provider finalize failure leaves public metadata, current pointer, audit and outbox absent", async (t) => {
  const fixture = await createMigratedPostgresFixture(t);
  if (!fixture) return;
  const base = createLocalStorageAdapter({ adapter_id: "provider-failure" });
  const storage = Object.freeze({
    ...base,
    finalizeObject() {
      const error = new Error("provider unavailable");
      error.code = "DMS_TEST_PROVIDER_UNAVAILABLE";
      throw error;
    },
  });
  const runtime = createPostgresDmsUploadRuntime({ pool: fixture.appPool, storage, clock: () => new Date(NOW) });
  const session = input("provider-failure", { adapter_id: storage.adapter_id });
  await runtime.createUploadSession(session);
  await runtime.stageUpload({ tenant_id: TENANT, session_id: session.session_id, bytes: BYTES });
  await assert.rejects(runtime.finalizeUpload({ tenant_id: TENANT, session_id: session.session_id }));
  assert.equal(await runtime.getDocumentState({ tenant_id: TENANT, document_id: session.document_id }), null);
});

function createCorruptingStorage() {
  const staged = new Map();
  const committed = new Map();
  const adapter_id = "malicious-corrupting";
  const key = ({ tenant_id, session_id = "", object_id }) => `${tenant_id}\u0000${session_id}\u0000${object_id}`;
  const fakeStage = (input) => createStagingReceipt({ ...input, adapter_id, bytes: BYTES });
  return Object.freeze({
    adapter_id,
    contract_version: DMS_STORAGE_ADAPTER_CONTRACT_VERSION,
    capabilities: Object.freeze({ staged_uploads: true, digest_verification: true, orphan_cleanup: true, provider_retention: false, conditional_delete: true }),
    stageObject(input) {
      staged.set(key(input), Buffer.from("corrupted provider bytes"));
      return fakeStage(input);
    },
    statStagedObject(input) {
      return staged.has(key(input)) ? fakeStage(input) : null;
    },
    digestObject(input) {
      const bytes = input.session_id ? staged.get(key(input)) : committed.get(key(input));
      return bytes ? Object.freeze({ sha256: sha256Hex(bytes), byte_size: bytes.byteLength }) : null;
    },
    finalizeObject(input) {
      const bytes = staged.get(key(input));
      committed.set(key({ ...input, session_id: "" }), bytes);
      staged.delete(key(input));
      return createStorageReceipt({ ...input, adapter_id, bytes: BYTES });
    },
    deleteOrphan(input) { return Object.freeze({ deleted: staged.delete(key(input)), committed_object_deleted: false }); },
    deleteCommittedObject() { return Object.freeze({ deleted: false }); },
    putObject() { throw new Error("not used"); },
    getObject(input) { return Object.freeze({ bytes: Buffer.from(committed.get(key({ ...input, session_id: "" })) ?? []) }); },
    statObject(input) {
      const bytes = committed.get(key({ ...input, session_id: "" }));
      return bytes ? createStorageReceipt({ ...input, adapter_id, bytes }) : null;
    },
  });
}

test("DMS-06 independent digest readback rejects a forged receipt over corrupted staged bytes", async (t) => {
  const fixture = await createMigratedPostgresFixture(t);
  if (!fixture) return;
  const storage = createCorruptingStorage();
  const runtime = createPostgresDmsUploadRuntime({ pool: fixture.appPool, storage, clock: () => new Date(NOW) });
  const session = input("corrupt", { adapter_id: storage.adapter_id });
  await runtime.createUploadSession(session);
  await assert.rejects(
    runtime.stageUpload({ tenant_id: TENANT, session_id: session.session_id, bytes: BYTES }),
    (error) => error?.safe_error_code === "DMS_STAGED_DIGEST_MISMATCH",
  );
  assert.equal(await runtime.getDocumentState({ tenant_id: TENANT, document_id: session.document_id }), null);
});

test("DMS-05 a stale stage completion cannot leave a lease on a finalized session", async (t) => {
  const fixture = await createMigratedPostgresFixture(t);
  if (!fixture) return;
  const base = createLocalStorageAdapter({ adapter_id: "stale-stage" });
  let release;
  const gate = new Promise((resolve) => { release = resolve; });
  let staged;
  const storage = Object.freeze({
    ...base,
    async stageObject(input) {
      const receipt = base.stageObject(input);
      staged?.();
      await gate;
      return receipt;
    },
  });
  const runtimeA = createPostgresDmsUploadRuntime({ pool: fixture.appPool, storage, clock: () => new Date(NOW) });
  const runtimeB = createPostgresDmsUploadRuntime({ pool: fixture.appPool, storage: base, clock: () => new Date(NOW) });
  const session = input("stale-stage", { adapter_id: storage.adapter_id });
  await runtimeA.createUploadSession(session);
  const stageStarted = new Promise((resolve) => { staged = resolve; });
  const staleStage = runtimeA.stageUpload({ tenant_id: TENANT, session_id: session.session_id, bytes: BYTES });
  await stageStarted;
  await assert.rejects(
    runtimeB.finalizeUpload({ tenant_id: TENANT, session_id: session.session_id }),
    (error) => error?.safe_error_code === "DMS_UPLOAD_STAGE_LEASE_ACTIVE",
  );
  release();
  await staleStage;
  await runtimeB.finalizeUpload({ tenant_id: TENANT, session_id: session.session_id });
  const finalized = await runtimeA.getUploadSession(session);
  assert.equal(finalized.state, "finalized");
  assert.equal(finalized.stage_lease_expires_at, null);
  assert.equal(finalized.stage_lease_owner ?? null, null);
});

test("DMS-08 concurrent reconciler workers claim each provider finalize once", async (t) => {
  const fixture = await createMigratedPostgresFixture(t);
  if (!fixture) return;
  const base = createLocalStorageAdapter({ adapter_id: "reconciler-claim" });
  let finalizeCalls = 0;
  const storage = Object.freeze({
    ...base,
    finalizeObject(input) {
      finalizeCalls += 1;
      return base.finalizeObject(input);
    },
  });
  const session = input("reconciler-claim", { adapter_id: storage.adapter_id });
  const writer = createPostgresDmsUploadRuntime({ pool: fixture.appPool, storage, clock: () => new Date(NOW) });
  await writer.createUploadSession(session);
  await writer.stageUpload({ tenant_id: TENANT, session_id: session.session_id, bytes: BYTES });
  const workerA = createPostgresDmsUploadRuntime({ pool: fixture.appPool, storage, clock: () => new Date(NOW), workerId: "worker-a" });
  const workerB = createPostgresDmsUploadRuntime({ pool: fixture.appPool, storage, clock: () => new Date(NOW), workerId: "worker-b" });
  await Promise.all([
    workerA.reconcileUploadSessions({ tenant_id: TENANT }),
    workerB.reconcileUploadSessions({ tenant_id: TENANT }),
  ]);
  assert.equal(finalizeCalls, 1);
  assert.equal((await writer.getUploadSession(session)).state, "finalized");
});

test("DMS-03 committed delete intent fails reads closed, rechecks holds, and never repeats provider success", async (t) => {
  const fixture = await createMigratedPostgresFixture(t);
  if (!fixture) return;
  const base = createLocalStorageAdapter({ adapter_id: "delete-intent" });
  const deleteCalls = [];
  const storage = Object.freeze({
    ...base,
    deleteCommittedObject(input) {
      deleteCalls.push(Object.freeze({ ...input }));
      return base.deleteCommittedObject(input);
    },
  });
  const runtime = createPostgresDmsUploadRuntime({ pool: fixture.appPool, storage, clock: () => new Date(NOW) });
  const blocked = await upload(runtime, storage, "delete-held-race");
  const blockedIntent = await runtime.requestCommittedObjectDelete({
    tenant_id: TENANT,
    document_id: blocked.document_id,
    object_id: blocked.object_id,
    idempotency_key: "delete-held-race",
    requested_by: "records-admin",
  });
  await assert.rejects(
    runtime.getDocumentState({ tenant_id: TENANT, document_id: blocked.document_id }),
    (error) => error?.safe_error_code === "DMS_OBJECT_DELETE_PENDING",
  );
  await runtime.placeLegalHold({
    tenant_id: TENANT,
    legal_hold_id: "hold-after-delete-intent",
    document_id: blocked.document_id,
    object_id: blocked.object_id,
    created_by: "legal-admin",
    reason: "hold raced with delete",
  });
  await assert.rejects(
    runtime.executeCommittedObjectDelete({ tenant_id: TENANT, delete_intent_id: blockedIntent.intent.delete_intent_id }),
    (error) => error?.safe_error_code === "DMS_LEGAL_HOLD_DELETE_BLOCKED",
  );
  assert.equal(base.statObject({ tenant_id: TENANT, object_id: blocked.object_id }).sha256, sha256Hex(BYTES));

  const deletable = await upload(runtime, storage, "delete-success");
  const requested = await runtime.requestCommittedObjectDelete({
    tenant_id: TENANT,
    document_id: deletable.document_id,
    object_id: deletable.object_id,
    idempotency_key: "delete-success",
    requested_by: "records-admin",
  });
  const deleteWorkerB = createPostgresDmsUploadRuntime({ pool: fixture.appPool, storage, clock: () => new Date(NOW), workerId: "delete-worker-b" });
  const deleteOutcomes = (await Promise.all([
    runtime.reconcileDeleteIntents({ tenant_id: TENANT }),
    deleteWorkerB.reconcileDeleteIntents({ tenant_id: TENANT }),
  ])).flat();
  assert.equal(deleteOutcomes.filter((row) => row.action === "delete_completed").length, 1);
  assert.equal(base.statObject({ tenant_id: TENANT, object_id: deletable.object_id }), null);
  const replay = await runtime.executeCommittedObjectDelete({ tenant_id: TENANT, delete_intent_id: requested.intent.delete_intent_id });
  assert.equal(replay.replayed, true);
  assert.deepEqual(deleteCalls.map((row) => row.object_id), [deletable.object_id]);
});

test("DMS-08 reconciler applies bounded backoff and seals one terminal dead-letter receipt", async (t) => {
  const fixture = await createMigratedPostgresFixture(t);
  if (!fixture) return;
  let now = new Date(NOW);
  const base = createLocalStorageAdapter({ adapter_id: "reconciler-backoff" });
  const storage = Object.freeze({
    ...base,
    finalizeObject() {
      const error = new Error("deterministic provider failure");
      error.code = "DMS_TEST_PROVIDER_FAILURE";
      throw error;
    },
  });
  const runtime = createPostgresDmsUploadRuntime({
    pool: fixture.appPool,
    storage,
    clock: () => now,
    workerId: "backoff-worker",
    maxReconciliationAttempts: 2,
    reconciliationBackoffMillis: 1_000,
  });
  const session = input("reconciler-backoff", { adapter_id: storage.adapter_id });
  await runtime.createUploadSession(session);
  await runtime.stageUpload({ tenant_id: TENANT, session_id: session.session_id, bytes: BYTES });
  const first = await runtime.reconcileUploadSessions({ tenant_id: TENANT });
  assert.equal(first[0].terminal, false);
  const afterFirst = await runtime.getUploadSession(session);
  assert.equal(afterFirst.reconciliation_attempt_count, 1);
  assert.equal(Date.parse(afterFirst.next_attempt_at) > now.getTime(), true);
  now = new Date(now.getTime() + 2_000);
  const second = await runtime.reconcileUploadSessions({ tenant_id: TENANT });
  assert.equal(second[0].terminal, true);
  const terminal = await runtime.getUploadSession(session);
  assert.equal(terminal.state, "failed_terminal");
  assert.equal(terminal.dead_letter_receipt.attempt_count, 2);
  assert.equal((await runtime.reconcileUploadSessions({ tenant_id: TENANT })).length, 0);
});
