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

const TENANT = "tenant-completion-cleanup-bound";
const BYTES = Buffer.from("Object Lock bounded completion cleanup");
const SHA = createHash("sha256").update(BYTES).digest("hex");

function receiptBinding(receipt) {
  const {
    schema_version, kind, session_id, object_id, expected_sha256,
    safe_error_code, quarantined_at, storage_deny_record_ref,
    postgres_consumer_deny_authority, cleanup_error_code,
    logically_denied, committed_object_deleted, staged_object_deleted,
    provider_object_retained, staged_object_retained, staged_cleanup_error_code,
  } = receipt;
  return {
    schema_version, kind, session_id, object_id, expected_sha256,
    safe_error_code, quarantined_at, storage_deny_record_ref,
    postgres_consumer_deny_authority, cleanup_error_code,
    logically_denied, committed_object_deleted, staged_object_deleted,
    provider_object_retained, staged_object_retained, staged_cleanup_error_code,
  };
}

test("completion cleanup preserves its deny receipt and stops at manual recovery", async (t) => {
  const postgres = await createMigratedPostgresFixture(t);
  if (!postgres) return;
  const base = createLocalStorageAdapter({ adapter_id: "completion-cleanup-bound-storage" });
  const {
    armCommittedObjectQuarantine: _arm,
    clearCommittedObjectQuarantine: _clear,
    getCommittedObjectQuarantine: _get,
    quarantineCommittedObject: _quarantine,
    recordCommittedObjectQuarantine: _record,
    ...unquarantined
  } = base;
  const calls = { finalize: 0, read: 0, delete_orphan: 0 };
  const storage = Object.freeze({
    ...unquarantined,
    provider: "s3-shaped-test",
    finalizeObject(input) { calls.finalize += 1; return base.finalizeObject(input); },
    getObject(input) { calls.read += 1; return base.getObject(input); },
    statObject(input) { calls.read += 1; return base.statObject(input); },
    readObjectBounded(input) { calls.read += 1; return base.readObjectBounded(input); },
    deleteOrphan() {
      calls.delete_orphan += 1;
      return { deleted: true, committed_object_deleted: true };
    },
  });
  const authority = createPostgresDmsConsumerReadAuthority({ pool: postgres.appPool });
  await authority.probe({ tenant_id: TENANT, adapter_id: storage.adapter_id });
  let now = "2026-08-09T04:00:00.000Z";
  const runtime = createPostgresDmsUploadRuntime({
    pool: postgres.appPool,
    storage,
    committedStorage: createPostgresDmsConsumerStorage({ storage, authority }),
    completionDenyAuthority: authority,
    clock: () => new Date(now),
    maxReconciliationAttempts: 2,
  });
  const suffix = "attempt-bound";
  await assert.rejects(runtime.uploadDocument({
    document: {
      tenant_id: TENANT,
      matter_id: `matter-${suffix}`,
      workspace_id: `workspace-${suffix}`,
      document_id: `document-${suffix}`,
      current_version_id: `version-${suffix}`,
      title: "Signed agreement.pdf",
      mime_type: "application/pdf",
      permission_envelope_id: `permission-${suffix}`,
      audit_trace_id: `audit-${suffix}`,
    },
    bytes: BYTES,
    actor_id: "actor-completion-cleanup-bound",
    idempotency_key: `completion-${suffix}`,
    object_id: `object-${suffix}`,
    session_id: `session-${suffix}`,
    completion_authority: {
      schema_version: "law-firm-os.dms-completion-authority-contract.v1",
      provider: "docusign",
      tenant_id: TENANT,
      matter_id: `matter-${suffix}`,
      workspace_id: `workspace-${suffix}`,
      request_id: `request-${suffix}`,
      envelope_id: `envelope-${suffix}`,
      kind: "signed_pdf",
      sha256: SHA,
      object_id: `object-${suffix}`,
      idempotency_key: `completion-${suffix}`,
      permission_envelope_id: `permission-${suffix}`,
      audit_trace_id: `audit-${suffix}`,
      fencing_generation: 1,
    },
    beforePersist({ phase }) {
      if (phase === "before_metadata") throw Object.assign(new Error("authority changed"), {
        completion_authority_rejection: true,
        safe_error_code: "DOCUSIGN_PERMISSION_AUTHORITY_CHANGED",
      });
    },
  }), (error) => error?.safe_error_code === "DOCUSIGN_PERMISSION_AUTHORITY_CHANGED");

  const read = () => runtime.getUploadSession({ tenant_id: TENANT, session_id: `session-${suffix}` });
  const initial = await read();
  const binding = receiptBinding(initial.dead_letter_receipt);
  assert.equal(initial.reconciliation_attempt_count, 0);
  assert.equal(binding.provider_object_retained, true);
  assert.deepEqual({ finalize: calls.finalize, read: calls.read, delete_orphan: calls.delete_orphan }, {
    finalize: 1, read: 1, delete_orphan: 1,
  });

  now = initial.next_attempt_at;
  await runtime.reconcileUploadSessions({ tenant_id: TENANT });
  const afterFirst = await read();
  assert.deepEqual(receiptBinding(afterFirst.dead_letter_receipt), binding);
  assert.deepEqual({
    attempts: afterFirst.reconciliation_attempt_count,
    receipt_attempts: afterFirst.dead_letter_receipt.cleanup_attempt_count,
    max: afterFirst.dead_letter_receipt.cleanup_max_attempts,
    state: afterFirst.dead_letter_receipt.cleanup_state,
  }, { attempts: 1, receipt_attempts: 1, max: 2, state: "pending" });
  assert.equal(Date.parse(afterFirst.next_attempt_at) > Date.parse(initial.next_attempt_at), true);
  const callsBeforeEarlyRetry = calls.delete_orphan;
  assert.deepEqual(await runtime.reconcileUploadSessions({ tenant_id: TENANT }), []);
  assert.equal(calls.delete_orphan, callsBeforeEarlyRetry);

  now = afterFirst.next_attempt_at;
  await runtime.reconcileUploadSessions({ tenant_id: TENANT });
  const terminal = await read();
  assert.deepEqual(receiptBinding(terminal.dead_letter_receipt), binding);
  assert.deepEqual({
    state: terminal.state,
    retryable: terminal.retryable,
    attempts: terminal.reconciliation_attempt_count,
    receipt_attempts: terminal.dead_letter_receipt.cleanup_attempt_count,
    max: terminal.dead_letter_receipt.cleanup_max_attempts,
    cleanup_state: terminal.dead_letter_receipt.cleanup_state,
    cleanup_retryable: terminal.dead_letter_receipt.cleanup_retryable,
  }, {
    state: "failed_terminal", retryable: false, attempts: 2, receipt_attempts: 2,
    max: 2, cleanup_state: "manual_recovery_required", cleanup_retryable: false,
  });
  const callsAtTerminal = calls.delete_orphan;
  now = "2026-08-10T04:00:00.000Z";
  assert.deepEqual(await runtime.reconcileUploadSessions({ tenant_id: TENANT }), []);
  assert.equal(calls.delete_orphan, callsAtTerminal);
});
