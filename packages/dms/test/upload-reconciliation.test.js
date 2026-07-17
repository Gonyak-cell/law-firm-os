import assert from "node:assert/strict";
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import {
  assertStagedStorageAdapter,
  createFileStorageAdapter,
  createLocalStorageAdapter,
  createPostgresDmsUploadRuntime,
  sha256Hex,
} from "../src/index.js";
import { withPostgresTransaction } from "../../persistence/src/postgres/transaction.js";
import { createMigratedPostgresFixture } from "../../persistence/test/helpers/disposable-postgres.js";

const TENANT = "tenant-dms-postgres-a";
const OTHER_TENANT = "tenant-dms-postgres-b";
const BYTES = Buffer.from("DMS staged upload fixture", "utf8");

function sessionInput(prefix, overrides = {}) {
  return {
    tenant_id: TENANT,
    session_id: `session-${prefix}`,
    idempotency_key: `idem-${prefix}`,
    matter_id: `matter-${prefix}`,
    workspace_id: `workspace-${prefix}`,
    document_id: `document-${prefix}`,
    version_id: `version-${prefix}-1`,
    version_number: 1,
    object_id: `object-${prefix}-1`,
    title: `Document ${prefix}`,
    content_type: "text/plain",
    expected_sha256: sha256Hex(BYTES),
    expected_byte_size: BYTES.byteLength,
    permission_envelope_id: `permission-${prefix}`,
    audit_trace_id: `trace-${prefix}`,
    actor_id: "user-dms-test",
    expires_at: "2026-07-17T00:00:00.000Z",
    ...overrides,
  };
}

function controlledFault() {
  let target = null;
  return {
    set(point) {
      target = point;
    },
    clear() {
      target = null;
    },
    inject(point) {
      if (point !== target) return;
      const error = new Error(`injected DMS failure at ${point}`);
      error.code = `LAWOS_TEST_${point.toUpperCase()}`;
      throw error;
    },
  };
}

test("RS-DMS storage contract stages, verifies, finalizes and deletes only staged orphans", () => {
  const storage = assertStagedStorageAdapter(createLocalStorageAdapter({ adapter_id: "local-contract" }));
  const staged = storage.stageObject({
    tenant_id: TENANT,
    session_id: "session-contract",
    object_id: "object-contract",
    bytes: BYTES,
    content_type: "text/plain",
    expected_sha256: sha256Hex(BYTES),
  });
  assert.equal(staged.state, "staged");
  assert.equal(staged.storage_pointer_ref, null);
  assert.equal(staged.raw_path_exposed, false);
  assert.deepEqual(storage.digestObject({ tenant_id: TENANT, session_id: "session-contract", object_id: "object-contract" }), {
    sha256: sha256Hex(BYTES),
    byte_size: BYTES.byteLength,
  });
  assert.throws(
    () => storage.stageObject({
      tenant_id: TENANT,
      session_id: "session-contract",
      object_id: "object-contract",
      bytes: "different",
      content_type: "text/plain",
    }),
    (error) => error?.code === "DMS_STAGE_IDEMPOTENCY_CONFLICT",
  );
  const finalized = storage.finalizeObject({ tenant_id: TENANT, session_id: "session-contract", object_id: "object-contract" });
  assert.equal(finalized.sha256, sha256Hex(BYTES));
  assert.equal(storage.statStagedObject({ tenant_id: TENANT, session_id: "session-contract", object_id: "object-contract" }), null);
  assert.equal(storage.getObject({ tenant_id: TENANT, object_id: "object-contract" }).bytes.toString("utf8"), BYTES.toString("utf8"));
  assert.deepEqual(storage.deleteOrphan({ tenant_id: TENANT, session_id: "session-contract", object_id: "object-contract" }), {
    deleted: false,
    committed_object_deleted: false,
  });
  assert.equal(storage.statObject({ tenant_id: TENANT, object_id: "object-contract" }).sha256, finalized.sha256);
});

test("RS-DMS file adapter compensates durable write faults and retries the finalize cleanup gap", () => {
  const rootPath = join(mkdtempSync(join(tmpdir(), "dms-staged-file-")), "objects");
  const fault = controlledFault();
  const storage = createFileStorageAdapter({ adapter_id: "file-contract", rootPath, faultInjector: fault.inject });

  fault.set("stage:after_rename");
  assert.throws(
    () => storage.stageObject({ tenant_id: TENANT, session_id: "session-stage-fault", object_id: "object-stage-fault", bytes: BYTES }),
    (error) => error?.code === "LAWOS_TEST_STAGE:AFTER_RENAME",
  );
  assert.equal(storage.statStagedObject({ tenant_id: TENANT, session_id: "session-stage-fault", object_id: "object-stage-fault" }), null);

  fault.clear();
  storage.stageObject({ tenant_id: TENANT, session_id: "session-finalize-fault", object_id: "object-finalize-fault", bytes: BYTES });
  fault.set("finalize:after_rename");
  assert.throws(
    () => storage.finalizeObject({ tenant_id: TENANT, session_id: "session-finalize-fault", object_id: "object-finalize-fault" }),
    (error) => error?.code === "LAWOS_TEST_FINALIZE:AFTER_RENAME",
  );
  assert.equal(storage.statObject({ tenant_id: TENANT, object_id: "object-finalize-fault" }), null);
  assert.equal(storage.statStagedObject({ tenant_id: TENANT, session_id: "session-finalize-fault", object_id: "object-finalize-fault" }).sha256, sha256Hex(BYTES));

  fault.clear();
  storage.finalizeObject({ tenant_id: TENANT, session_id: "session-finalize-fault", object_id: "object-finalize-fault" });
  storage.stageObject({ tenant_id: TENANT, session_id: "session-cleanup-gap", object_id: "object-cleanup-gap", bytes: BYTES });
  fault.set("after_finalize_write_before_staged_cleanup");
  assert.throws(
    () => storage.finalizeObject({ tenant_id: TENANT, session_id: "session-cleanup-gap", object_id: "object-cleanup-gap" }),
    (error) => error?.code === "LAWOS_TEST_AFTER_FINALIZE_WRITE_BEFORE_STAGED_CLEANUP",
  );
  assert.equal(storage.statObject({ tenant_id: TENANT, object_id: "object-cleanup-gap" }).sha256, sha256Hex(BYTES));
  assert.equal(storage.statStagedObject({ tenant_id: TENANT, session_id: "session-cleanup-gap", object_id: "object-cleanup-gap" }).sha256, sha256Hex(BYTES));
  fault.clear();
  storage.finalizeObject({ tenant_id: TENANT, session_id: "session-cleanup-gap", object_id: "object-cleanup-gap" });
  assert.equal(storage.statStagedObject({ tenant_id: TENANT, session_id: "session-cleanup-gap", object_id: "object-cleanup-gap" }), null);
});

test("DMS-09 file adapter reopens to clean absence or valid staged bytes at every durable kill point", () => {
  const faultPoints = ["after_temp_write", "after_temp_fsync", "after_rename", "after_directory_fsync", "sidecar:after_rename"];
  for (const [index, point] of faultPoints.entries()) {
    const rootPath = join(mkdtempSync(join(tmpdir(), `dms-crash-${index}-`)), "objects");
    const fault = controlledFault();
    const storage = createFileStorageAdapter({ adapter_id: `file-crash-${index}`, rootPath, faultInjector: fault.inject });
    const session_id = `session-crash-${index}`;
    const object_id = `object-crash-${index}`;
    fault.set(`stage:${point}`);
    assert.throws(() => storage.stageObject({ tenant_id: TENANT, session_id, object_id, bytes: BYTES }));
    const reopenedAfterStage = createFileStorageAdapter({ adapter_id: `file-crash-${index}`, rootPath });
    assert.equal(reopenedAfterStage.statStagedObject({ tenant_id: TENANT, session_id, object_id }), null);

    fault.clear();
    storage.stageObject({ tenant_id: TENANT, session_id, object_id, bytes: BYTES });
    fault.set(`finalize:${point}`);
    assert.throws(() => storage.finalizeObject({ tenant_id: TENANT, session_id, object_id }));
    const reopenedAfterFinalize = createFileStorageAdapter({ adapter_id: `file-crash-${index}`, rootPath });
    assert.equal(reopenedAfterFinalize.statObject({ tenant_id: TENANT, object_id }), null);
    assert.equal(reopenedAfterFinalize.statStagedObject({ tenant_id: TENANT, session_id, object_id }).sha256, sha256Hex(BYTES));
  }
});

test("RS-DMS PostgreSQL schema forces tenant RLS across every upload runtime table", async (t) => {
  const fixture = await createMigratedPostgresFixture(t);
  if (!fixture) return;
  const catalog = await fixture.adminPool.query(
    `SELECT c.relname, c.relrowsecurity, c.relforcerowsecurity
       FROM pg_class c
       JOIN pg_namespace n ON n.oid = c.relnamespace
      WHERE n.nspname = 'lawos_dms' AND c.relkind = 'r'
      ORDER BY c.relname`,
  );
  assert.deepEqual(catalog.rows.map((row) => row.relname), [
    "audit_events",
    "delete_intents",
    "document_versions",
    "documents",
    "file_objects",
    "idempotency_keys",
    "legal_holds",
    "outbox_events",
    "retention_policies",
    "upload_sessions",
  ]);
  assert.equal(catalog.rows.every((row) => row.relrowsecurity && row.relforcerowsecurity), true);

  const runtime = createPostgresDmsUploadRuntime({
    pool: fixture.appPool,
    storage: createLocalStorageAdapter(),
    clock: () => new Date("2026-07-16T00:00:00.000Z"),
  });
  await runtime.createUploadSession(sessionInput("rls", { tenant_id: OTHER_TENANT }));
  await assert.rejects(
    runtime.getUploadSession({ tenant_id: TENANT, session_id: "session-rls" }),
    (error) => error?.safe_error_code === "DMS_UPLOAD_SESSION_NOT_FOUND",
  );
  const hidden = await withPostgresTransaction(fixture.appPool, { tenant_id: TENANT }, (client) => client.query(
    "SELECT session_id FROM lawos_dms.upload_sessions WHERE tenant_id = $1",
    [OTHER_TENANT],
  ));
  assert.deepEqual(hidden.rows, []);

  await assert.rejects(
    withPostgresTransaction(fixture.appPool, { tenant_id: OTHER_TENANT }, (client) => client.query(
      `UPDATE lawos_dms.upload_sessions
          SET state = 'finalized', finalized_at = clock_timestamp()
        WHERE tenant_id = $1 AND session_id = 'session-rls'`,
      [OTHER_TENANT],
    )),
  );
});

test("RS-DMS upload session is idempotent and finalizes document, version, file, audit and outbox state", async (t) => {
  const fixture = await createMigratedPostgresFixture(t);
  if (!fixture) return;
  const storage = createLocalStorageAdapter({ adapter_id: "local-happy" });
  const runtime = createPostgresDmsUploadRuntime({
    pool: fixture.appPool,
    storage,
    clock: () => new Date("2026-07-16T01:00:00.000Z"),
  });
  const input = sessionInput("happy", { adapter_id: storage.adapter_id });
  const created = await runtime.createUploadSession(input);
  assert.equal(created.replayed, false);
  assert.equal(created.session.state, "pending");
  const replay = await runtime.createUploadSession({ ...input, session_id: "ignored-on-replay" });
  assert.equal(replay.replayed, true);
  assert.equal(replay.session.session_id, input.session_id);
  await assert.rejects(
    runtime.createUploadSession({ ...input, title: "Different request" }),
    (error) => error?.safe_error_code === "DMS_IDEMPOTENCY_CONFLICT",
  );

  assert.equal((await runtime.stageUpload({ tenant_id: TENANT, session_id: input.session_id, bytes: BYTES })).session.state, "bytes_stored");
  const finalized = await runtime.finalizeUpload({ tenant_id: TENANT, session_id: input.session_id });
  assert.equal(finalized.session.state, "finalized");
  assert.equal(finalized.receipt.raw_path_exposed, false);
  assert.equal((await runtime.finalizeUpload({ tenant_id: TENANT, session_id: input.session_id })).replayed, true);
  const state = await runtime.getDocumentState({ tenant_id: TENANT, document_id: input.document_id });
  assert.equal(state.document.current_version_id, input.version_id);
  assert.equal(state.versions.length, 1);
  assert.equal(state.file_objects.length, 1);
  assert.equal(state.file_objects[0].storage_pointer_ref.startsWith("vault://"), true);
  assert.equal(state.outbox_events.length, 1);
  assert.equal(state.audit_events.some((event) => event.event_type === "dms.document.metadata_committed"), true);

  const version3 = sessionInput("happy-v3", {
    adapter_id: storage.adapter_id,
    matter_id: input.matter_id,
    workspace_id: input.workspace_id,
    document_id: input.document_id,
    version_id: "version-happy-3",
    version_number: 3,
    object_id: "object-happy-3",
    permission_envelope_id: input.permission_envelope_id,
  });
  const version2 = sessionInput("happy-v2", {
    adapter_id: storage.adapter_id,
    matter_id: input.matter_id,
    workspace_id: input.workspace_id,
    document_id: input.document_id,
    version_id: "version-happy-2",
    version_number: 2,
    object_id: "object-happy-2",
    permission_envelope_id: input.permission_envelope_id,
  });
  for (const version of [version3, version2]) {
    await runtime.createUploadSession(version);
    await runtime.stageUpload({ tenant_id: TENANT, session_id: version.session_id, bytes: BYTES });
    await runtime.finalizeUpload({ tenant_id: TENANT, session_id: version.session_id });
  }
  const outOfOrder = await runtime.getDocumentState({ tenant_id: TENANT, document_id: input.document_id });
  assert.equal(outOfOrder.document.current_version_id, version3.version_id);
  assert.deepEqual(outOfOrder.versions.map((version) => version.version_number), [1, 2, 3]);
  assert.equal(runtime.source_only, true);
  assert.equal(runtime.production_ready_claim, false);
});

test("RS-DMS reconciler repairs every storage and transaction kill point without duplicate metadata", async (t) => {
  const fixture = await createMigratedPostgresFixture(t);
  if (!fixture) return;
  const storage = createLocalStorageAdapter({ adapter_id: "local-kill-points" });
  const fault = controlledFault();
  const runtime = createPostgresDmsUploadRuntime({
    pool: fixture.appPool,
    storage,
    clock: () => new Date("2026-07-16T02:00:00.000Z"),
    faultInjector: fault.inject,
  });

  const stagedGap = sessionInput("after-stage", { adapter_id: storage.adapter_id });
  await runtime.createUploadSession(stagedGap);
  fault.set("after_storage_stage_before_db_update");
  await assert.rejects(
    runtime.stageUpload({ tenant_id: TENANT, session_id: stagedGap.session_id, bytes: BYTES }),
    (error) => error?.code === "LAWOS_TEST_AFTER_STORAGE_STAGE_BEFORE_DB_UPDATE",
  );
  assert.equal((await runtime.getUploadSession(stagedGap)).state, "failed");
  fault.clear();
  assert.equal((await runtime.reconcileUploadSessions({ tenant_id: TENANT })).some((row) => row.session_id === stagedGap.session_id && row.state === "finalized"), true);

  const rollbackGap = sessionInput("before-commit", { adapter_id: storage.adapter_id });
  await runtime.createUploadSession(rollbackGap);
  await runtime.stageUpload({ tenant_id: TENANT, session_id: rollbackGap.session_id, bytes: BYTES });
  fault.set("before_metadata_commit");
  await assert.rejects(
    runtime.finalizeUpload({ tenant_id: TENANT, session_id: rollbackGap.session_id }),
    (error) => error?.code === "LAWOS_TEST_BEFORE_METADATA_COMMIT",
  );
  assert.equal((await runtime.getUploadSession(rollbackGap)).state, "provider_finalized");
  assert.equal(await runtime.getDocumentState({ tenant_id: TENANT, document_id: rollbackGap.document_id }), null);
  fault.clear();
  await runtime.reconcileUploadSessions({ tenant_id: TENANT });

  const metadataGap = sessionInput("after-metadata", { adapter_id: storage.adapter_id });
  await runtime.createUploadSession(metadataGap);
  await runtime.stageUpload({ tenant_id: TENANT, session_id: metadataGap.session_id, bytes: BYTES });
  fault.set("after_provider_finalize_before_receipt_persist");
  await assert.rejects(
    runtime.finalizeUpload({ tenant_id: TENANT, session_id: metadataGap.session_id }),
    (error) => error?.code === "LAWOS_TEST_AFTER_PROVIDER_FINALIZE_BEFORE_RECEIPT_PERSIST",
  );
  assert.equal((await runtime.getUploadSession(metadataGap)).state, "bytes_stored");
  assert.equal(await runtime.getDocumentState({ tenant_id: TENANT, document_id: metadataGap.document_id }), null);
  assert.equal(storage.statObject({ tenant_id: TENANT, object_id: metadataGap.object_id }).sha256, sha256Hex(BYTES));
  fault.clear();
  await runtime.reconcileUploadSessions({ tenant_id: TENANT });

  const finalizeGap = sessionInput("after-finalize", { adapter_id: storage.adapter_id });
  await runtime.createUploadSession(finalizeGap);
  await runtime.stageUpload({ tenant_id: TENANT, session_id: finalizeGap.session_id, bytes: BYTES });
  fault.set("after_storage_finalize_before_session_finalized");
  await assert.rejects(
    runtime.finalizeUpload({ tenant_id: TENANT, session_id: finalizeGap.session_id }),
    (error) => error?.code === "LAWOS_TEST_AFTER_STORAGE_FINALIZE_BEFORE_SESSION_FINALIZED",
  );
  assert.equal((await runtime.getUploadSession(finalizeGap)).state, "provider_finalized");
  assert.equal(storage.statObject({ tenant_id: TENANT, object_id: finalizeGap.object_id }).sha256, sha256Hex(BYTES));
  fault.clear();
  await runtime.reconcileUploadSessions({ tenant_id: TENANT });

  for (const input of [stagedGap, rollbackGap, metadataGap, finalizeGap]) {
    assert.equal((await runtime.getUploadSession(input)).state, "finalized");
    const state = await runtime.getDocumentState({ tenant_id: TENANT, document_id: input.document_id });
    assert.equal(state.versions.length, 1);
    assert.equal(state.file_objects.length, 1);
    assert.equal(state.outbox_events.length, 1);
  }
});

test("RS-DMS reconciler expires uncommitted uploads and never deletes committed objects", async (t) => {
  const fixture = await createMigratedPostgresFixture(t);
  if (!fixture) return;
  let now = "2026-07-16T03:00:00.000Z";
  const storage = createLocalStorageAdapter({ adapter_id: "local-orphan" });
  const runtime = createPostgresDmsUploadRuntime({ pool: fixture.appPool, storage, clock: () => new Date(now) });
  const orphan = sessionInput("orphan", {
    adapter_id: storage.adapter_id,
    expires_at: "2026-07-16T03:30:00.000Z",
  });
  await runtime.createUploadSession(orphan);
  await runtime.stageUpload({ tenant_id: TENANT, session_id: orphan.session_id, bytes: BYTES });
  now = "2026-07-16T04:00:00.000Z";
  const outcome = await runtime.reconcileUploadSessions({ tenant_id: TENANT });
  assert.equal(outcome.some((row) => row.session_id === orphan.session_id && row.action === "orphan_cleaned"), true);
  assert.equal((await runtime.getUploadSession(orphan)).state, "expired");
  assert.equal(storage.statStagedObject({ tenant_id: TENANT, session_id: orphan.session_id, object_id: orphan.object_id }), null);
  assert.equal(storage.statObject({ tenant_id: TENANT, object_id: orphan.object_id }), null);

  const leased = sessionInput("active-lease", {
    adapter_id: storage.adapter_id,
    expires_at: "2026-07-16T03:30:00.000Z",
  });
  now = "2026-07-16T03:00:00.000Z";
  await runtime.createUploadSession(leased);
  await withPostgresTransaction(fixture.appPool, { tenant_id: TENANT }, (client) => client.query(
    `UPDATE lawos_dms.upload_sessions
        SET stage_lease_expires_at = '2026-07-16T04:30:00.000Z'
      WHERE tenant_id = $1 AND session_id = $2`,
    [TENANT, leased.session_id],
  ));
  now = "2026-07-16T04:00:00.000Z";
  await assert.rejects(
    runtime.cleanupOrphan({ tenant_id: TENANT, session_id: leased.session_id }),
    (error) => error?.safe_error_code === "DMS_UPLOAD_STAGE_LEASE_ACTIVE",
  );

  const committed = sessionInput("committed-cleanup", { adapter_id: storage.adapter_id });
  await runtime.createUploadSession(committed);
  await runtime.stageUpload({ tenant_id: TENANT, session_id: committed.session_id, bytes: BYTES });
  await runtime.finalizeUpload({ tenant_id: TENANT, session_id: committed.session_id });
  await assert.rejects(
    runtime.cleanupOrphan({ tenant_id: TENANT, session_id: committed.session_id }),
    (error) => error?.safe_error_code === "DMS_COMMITTED_OBJECT_DELETE_BLOCKED",
  );
  assert.equal(storage.statObject({ tenant_id: TENANT, object_id: committed.object_id }).sha256, sha256Hex(BYTES));
});

test("RS-DMS legal hold and retention guards fail closed for committed object deletion", async (t) => {
  const fixture = await createMigratedPostgresFixture(t);
  if (!fixture) return;
  const storage = createLocalStorageAdapter({ adapter_id: "local-delete-guards" });
  const runtime = createPostgresDmsUploadRuntime({
    pool: fixture.appPool,
    storage,
    clock: () => new Date("2026-07-16T05:00:00.000Z"),
  });
  const held = sessionInput("held", { adapter_id: storage.adapter_id });
  await runtime.createUploadSession(held);
  await runtime.stageUpload({ tenant_id: TENANT, session_id: held.session_id, bytes: BYTES });
  await runtime.finalizeUpload({ tenant_id: TENANT, session_id: held.session_id });
  await runtime.placeLegalHold({
    tenant_id: TENANT,
    legal_hold_id: "hold-1",
    document_id: held.document_id,
    object_id: held.object_id,
    created_by: "legal-admin",
    reason: "active litigation hold",
  });
  await assert.rejects(
    runtime.assertCommittedObjectDeleteAllowed(held),
    (error) => error?.safe_error_code === "DMS_LEGAL_HOLD_DELETE_BLOCKED",
  );

  const retained = sessionInput("retained", { adapter_id: storage.adapter_id });
  await runtime.createUploadSession(retained);
  await runtime.stageUpload({ tenant_id: TENANT, session_id: retained.session_id, bytes: BYTES });
  await runtime.finalizeUpload({ tenant_id: TENANT, session_id: retained.session_id });
  await runtime.setRetentionPolicy({
    tenant_id: TENANT,
    retention_policy_id: "retention-1",
    document_id: retained.document_id,
    retain_until: "2030-01-01T00:00:00.000Z",
  });
  await assert.rejects(
    runtime.assertCommittedObjectDeleteAllowed(retained),
    (error) => error?.safe_error_code === "DMS_RETENTION_DELETE_BLOCKED",
  );
  await assert.rejects(
    withPostgresTransaction(fixture.appPool, { tenant_id: TENANT }, (client) => client.query(
      `UPDATE lawos_dms.retention_policies
          SET retain_until = '2027-01-01T00:00:00.000Z'
        WHERE tenant_id = $1 AND retention_policy_id = 'retention-1'`,
      [TENANT],
    )),
  );
  await assert.rejects(
    withPostgresTransaction(fixture.appPool, { tenant_id: TENANT }, (client) => client.query(
      `UPDATE lawos_dms.legal_holds
          SET status = 'active', released_at = NULL
        WHERE tenant_id = $1 AND legal_hold_id = 'hold-1'`,
      [TENANT],
    )),
  );
  assert.equal(storage.statObject({ tenant_id: TENANT, object_id: held.object_id }).sha256, sha256Hex(BYTES));
  assert.equal(storage.statObject({ tenant_id: TENANT, object_id: retained.object_id }).sha256, sha256Hex(BYTES));
});
