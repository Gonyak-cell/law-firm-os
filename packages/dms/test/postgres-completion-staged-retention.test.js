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

const TENANT = "tenant-completion-staged-retention";
const BYTES = Buffer.from("Object Lock retained staged completion bytes");
const SHA = createHash("sha256").update(BYTES).digest("hex");
const NOW = "2026-08-09T04:00:00.000Z";

function completionAuthority(suffix) {
  return Object.freeze({
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
  });
}

function uploadInput(suffix, beforePersist) {
  return {
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
    actor_id: "actor-completion-staged-retention",
    idempotency_key: `completion-${suffix}`,
    object_id: `object-${suffix}`,
    session_id: `session-${suffix}`,
    completion_authority: completionAuthority(suffix),
    beforePersist,
  };
}

async function runtimeFixture(t, suffix, deleteOrphan) {
  const postgres = await createMigratedPostgresFixture(t);
  if (!postgres) return null;
  const base = createLocalStorageAdapter({ adapter_id: `s3-shaped-${suffix}` });
  const counters = { finalize: 0, read: 0, delete_orphan: 0 };
  const {
    armCommittedObjectQuarantine: _arm,
    clearCommittedObjectQuarantine: _clear,
    getCommittedObjectQuarantine: _get,
    quarantineCommittedObject: _quarantine,
    recordCommittedObjectQuarantine: _record,
    ...unquarantined
  } = base;
  const storage = Object.freeze({
    ...unquarantined,
    provider: "s3-shaped-test",
    finalizeObject(input) { counters.finalize += 1; return base.finalizeObject(input); },
    getObject(input) { counters.read += 1; return base.getObject(input); },
    statObject(input) { counters.read += 1; return base.statObject(input); },
    readObjectBounded(input) { counters.read += 1; return base.readObjectBounded(input); },
    deleteOrphan(input) {
      counters.delete_orphan += 1;
      return deleteOrphan(input);
    },
  });
  const authority = createPostgresDmsConsumerReadAuthority({ pool: postgres.appPool });
  await authority.probe({ tenant_id: TENANT, adapter_id: storage.adapter_id });
  let now = NOW;
  return {
    authority,
    counters,
    setNow(value) { now = value; },
    runtime: createPostgresDmsUploadRuntime({
      pool: postgres.appPool,
      storage,
      committedStorage: createPostgresDmsConsumerStorage({ storage, authority }),
      completionDenyAuthority: authority,
      clock: () => new Date(now),
    }),
  };
}

function rejectBeforeProviderFinalize({ phase }) {
  if (phase === "before_provider_finalize") {
    throw Object.assign(new Error("completion authority changed"), {
      completion_authority_rejection: true,
      safe_error_code: "DOCUSIGN_PERMISSION_AUTHORITY_CHANGED",
    });
  }
}

test("OUTM-34 pre-provider rejection terminalizes retained staged S3 bytes without a hot loop", async (t) => {
  const fixture = await runtimeFixture(t, "pre-provider-retained", () => {
    throw Object.assign(new Error("Object Lock retention blocks staged delete"), {
      safe_error_code: "DMS_S3_OBJECT_LOCK_STAGED_DELETE_BLOCKED",
    });
  });
  if (!fixture) return;
  await assert.rejects(
    fixture.runtime.uploadDocument(uploadInput("pre-provider-retained", rejectBeforeProviderFinalize)),
    (error) => error?.safe_error_code === "DOCUSIGN_PERMISSION_AUTHORITY_CHANGED",
  );
  const session = await fixture.runtime.getUploadSession({
    tenant_id: TENANT,
    session_id: "session-pre-provider-retained",
  });
  assert.deepEqual({
    state: session.state,
    retryable: session.retryable,
    cleanup_state: session.dead_letter_receipt?.cleanup_state,
    staged_object_retained: session.dead_letter_receipt?.staged_object_retained,
    staged_cleanup_error_code: session.dead_letter_receipt?.staged_cleanup_error_code,
    finalize_calls: fixture.counters.finalize,
    read_calls: fixture.counters.read,
    staged_delete_calls: fixture.counters.delete_orphan,
  }, {
    state: "failed_terminal",
    retryable: false,
    cleanup_state: "logically_denied",
    staged_object_retained: true,
    staged_cleanup_error_code: "DMS_S3_OBJECT_LOCK_STAGED_DELETE_BLOCKED",
    finalize_calls: 0,
    read_calls: 0,
    staged_delete_calls: 1,
  });
  assert.deepEqual(await fixture.runtime.reconcileUploadSessions({ tenant_id: TENANT }), []);
});

test("OUTM-34 completion cleanup boundary faults remain pending with bounded reconciliation backoff", async (t) => {
  const fixture = await runtimeFixture(t, "boundary-backoff", () => ({
    deleted: true,
    committed_object_deleted: true,
  }));
  if (!fixture) return;
  await assert.rejects(
    fixture.runtime.uploadDocument(uploadInput("boundary-backoff", rejectBeforeProviderFinalize)),
    (error) => error?.safe_error_code === "DOCUSIGN_PERMISSION_AUTHORITY_CHANGED",
  );
  const initial = await fixture.runtime.getUploadSession({
    tenant_id: TENANT,
    session_id: "session-boundary-backoff",
  });
  fixture.setNow(initial.next_attempt_at);
  const first = await fixture.runtime.reconcileUploadSessions({ tenant_id: TENANT });
  assert.deepEqual(first.map(({ action, state }) => ({ action, state })), [{
    action: "authority_quarantined",
    state: "failed_terminal",
  }]);
  const afterFirst = await fixture.runtime.getUploadSession({
    tenant_id: TENANT,
    session_id: "session-boundary-backoff",
  });
  assert.equal(afterFirst.dead_letter_receipt.schema_version, "law-firm-os.dms-completion-authority-quarantine.v1");
  assert.equal(afterFirst.dead_letter_receipt.cleanup_state, "pending");
  assert.equal(afterFirst.dead_letter_receipt.cleanup_error_code, "DMS_STORAGE_DELETE_BOUNDARY_VIOLATION");
  assert.equal(Date.parse(afterFirst.next_attempt_at) > Date.parse(initial.next_attempt_at), true);
  const deleteCallsBeforeSecond = fixture.counters.delete_orphan;
  assert.deepEqual(await fixture.runtime.reconcileUploadSessions({ tenant_id: TENANT }), []);
  assert.equal(fixture.counters.delete_orphan, deleteCallsBeforeSecond);
  const afterSecond = await fixture.runtime.getUploadSession({
    tenant_id: TENANT,
    session_id: "session-boundary-backoff",
  });
  assert.deepEqual(afterSecond.dead_letter_receipt, afterFirst.dead_letter_receipt);
});
