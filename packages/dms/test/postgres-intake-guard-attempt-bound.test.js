import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import test from "node:test";

import { createMigratedPostgresFixture } from "../../persistence/test/helpers/disposable-postgres.js";
import {
  createPostgresDmsConsumerReadAuthority,
  createPostgresDmsConsumerStorage,
} from "../src/postgres-consumer-storage.js";
import { createPostgresDmsUploadRuntime } from "../src/postgres-upload-runtime.js";
import { createLocalStorageAdapter } from "../src/storage/local-storage-adapter.js";

const TENANT = "tenant-intake-guard-attempt-bound";
const BYTES = Buffer.from("expired provider finalized intake checkpoint");
const SHA = createHash("sha256").update(BYTES).digest("hex");
const SESSION_ID = "dms-upload:engagement:intake-guard-attempt-bound";
const DOCUMENT_ID = "document-intake-guard-attempt-bound";
const VERSION_ID = `version:${DOCUMENT_ID}:1`;
const OBJECT_ID = `object:${VERSION_ID}`;
const ACTOR = "actor-intake-guard-attempt-bound";
const KEY = "engagement-signed-document:intake-guard-attempt-bound";

function guard() {
  return Object.freeze({
    schema_version: "law-firm-os.dms-external-metadata-guard.v1",
    provider: "lawos-intake",
    tenant_id: TENANT,
    claim_id: createHash("sha256").update("intake-guard-attempt-claim").digest("hex"),
    request_fingerprint: createHash("sha256").update("intake-guard-attempt-request").digest("hex"),
    session_id: SESSION_ID,
    idempotency_key: KEY,
    document_id: DOCUMENT_ID,
    version_id: VERSION_ID,
    object_id: OBJECT_ID,
    expected_sha256: SHA,
    expected_byte_size: BYTES.byteLength,
    content_type: "application/pdf",
    actor_id: ACTOR,
  });
}

test("expired provider-finalized Intake guard reaches bounded manual recovery without provider I/O", async (t) => {
  const postgres = await createMigratedPostgresFixture(t, { appPoolMax: 1 });
  if (!postgres) return;
  const base = createLocalStorageAdapter({ adapter_id: "intake-guard-attempt-storage" });
  const calls = { finalize: 0, stat: 0, digest: 0, get: 0, bounded: 0, staged_stat: 0, orphan_delete: 0 };
  const storage = Object.freeze({
    ...base,
    finalizeObject(input) { calls.finalize += 1; return base.finalizeObject(input); },
    statObject(input) { calls.stat += 1; return base.statObject(input); },
    digestObject(input) { calls.digest += 1; return base.digestObject(input); },
    getObject(input) { calls.get += 1; return base.getObject(input); },
    readObjectBounded(input) { calls.bounded += 1; return base.readObjectBounded(input); },
    statStagedObject(input) { calls.staged_stat += 1; return base.statStagedObject(input); },
    deleteOrphan(input) { calls.orphan_delete += 1; return base.deleteOrphan(input); },
  });
  const authority = createPostgresDmsConsumerReadAuthority({ pool: postgres.appPool });
  await authority.probe({ tenant_id: TENANT, adapter_id: storage.adapter_id });
  const guarded = createPostgresDmsConsumerStorage({ storage, authority });
  let now = "2026-08-09T08:00:00.000Z";
  const runtime = createPostgresDmsUploadRuntime({
    pool: postgres.appPool,
    storage,
    committedStorage: guarded,
    completionDenyAuthority: authority,
    sourceOnly: false,
    clock: () => new Date(now),
    maxReconciliationAttempts: 2,
    reconciliationBackoffMillis: 1_000,
  });
  const completionAuthority = guard();
  await assert.rejects(runtime.uploadDocument({
    document: {
      tenant_id: TENANT,
      matter_id: "matter-intake-guard-attempt-bound",
      workspace_id: "workspace-intake-guard-attempt-bound",
      document_id: DOCUMENT_ID,
      current_version_id: VERSION_ID,
      title: "Signed engagement.pdf",
      mime_type: "application/pdf",
      permission_envelope_id: "permission-intake-guard-attempt-bound",
      audit_trace_id: "audit-intake-guard-attempt-bound",
    },
    bytes: BYTES,
    actor_id: ACTOR,
    idempotency_key: KEY,
    object_id: OBJECT_ID,
    session_id: SESSION_ID,
    expires_at: "2026-08-09T08:00:00.500Z",
    completion_authority: completionAuthority,
    beforePersist({ phase }) {
      if (phase === "before_metadata") throw new Error("Intake checkpoint unavailable");
    },
  }), (error) => error?.safe_error_code === "DMS_METADATA_EXTERNAL_METADATA_CHECKPOINT_FAILED");

  const read = () => runtime.getUploadSession({ tenant_id: TENANT, session_id: SESSION_ID });
  const initial = await read();
  assert.equal(initial.state, "provider_finalized");
  assert.equal(initial.reconciliation_attempt_count, 0);
  assert.deepEqual(initial.provider_receipt.completion_authority, completionAuthority);
  const callsAfterFailure = { ...calls };
  await assert.rejects(
    guarded.getObject({ tenant_id: TENANT, object_id: OBJECT_ID }),
    (error) => error?.safe_error_code === "DMS_COMMITTED_OBJECT_NOT_AUTHORIZED",
  );
  assert.deepEqual(calls, callsAfterFailure);

  now = "2026-08-09T08:00:01.000Z";
  const first = await runtime.reconcileUploadSessions({ tenant_id: TENANT });
  assert.deepEqual(first.map(({ action }) => action), ["awaiting_external_checkpoint"]);
  const afterFirst = await read();
  assert.equal(afterFirst.state, "provider_finalized");
  assert.equal(afterFirst.reconciliation_attempt_count, 1);
  assert.equal(afterFirst.retryable, true);
  assert.equal(Date.parse(afterFirst.next_attempt_at) > Date.parse(now), true);
  assert.deepEqual(afterFirst.provider_receipt.completion_authority, completionAuthority);
  assert.deepEqual(calls, callsAfterFailure);
  assert.deepEqual(await runtime.reconcileUploadSessions({ tenant_id: TENANT }), []);

  now = afterFirst.next_attempt_at;
  const second = await runtime.reconcileUploadSessions({ tenant_id: TENANT });
  assert.deepEqual(second.map(({ action }) => action), ["external_checkpoint_manual_recovery"]);
  const terminal = await read();
  assert.equal(terminal.state, "failed_terminal");
  assert.equal(terminal.retryable, false);
  assert.equal(terminal.reconciliation_attempt_count, 2);
  assert.deepEqual(terminal.provider_receipt.completion_authority, completionAuthority);
  assert.deepEqual(terminal.dead_letter_receipt, {
    schema_version: "law-firm-os.dms-external-metadata-guard-recovery.v1",
    kind: "external_metadata_checkpoint_expired",
    session_id: SESSION_ID,
    recovery_state: "manual_recovery_required",
    safe_error_code: "DMS_EXTERNAL_METADATA_CHECKPOINT_EXPIRED",
    provider_bytes_committed: true,
    attempt_count: 2,
    max_attempts: 2,
    recovered_at: now,
    terminal_at: now,
  });
  assert.equal(Object.hasOwn(terminal.dead_letter_receipt, "claim_id"), false);
  assert.equal(Object.hasOwn(terminal.dead_letter_receipt, "request_fingerprint"), false);
  assert.deepEqual(calls, callsAfterFailure);
  now = "2026-08-10T08:00:00.000Z";
  assert.deepEqual(await runtime.reconcileUploadSessions({ tenant_id: TENANT }), []);
  assert.deepEqual(calls, callsAfterFailure);
});
