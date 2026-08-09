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

const TENANT = "tenant-completion-object-lock";
const OBJECT = "object-completion-object-lock";
const SESSION = "session-completion-object-lock";
const BYTES = Buffer.from("Object Lock retained completion bytes");
const SHA = createHash("sha256").update(BYTES).digest("hex");

async function probedAuthority(pool, adapterId) {
  const authority = createPostgresDmsConsumerReadAuthority({ pool });
  await authority.probe({ tenant_id: TENANT, adapter_id: adapterId });
  return authority;
}

async function assertConsumerDeny(storage, providerReads) {
  const input = { tenant_id: TENANT, object_id: OBJECT };
  for (const read of [
    () => storage.getObject(input),
    () => storage.statObject(input),
    () => storage.digestObject(input),
    () => storage.readObjectBounded({ ...input, max_bytes: 1024 }),
  ]) {
    await assert.rejects(read(), (error) => error?.safe_error_code === "DMS_COMMITTED_OBJECT_NOT_AUTHORIZED");
  }
  assert.equal(providerReads.count, 0);
}

test("OUTM-34 Object-Lock completion rejection is durably denied without cleanup hot-loop", async (t) => {
  const postgres = await createMigratedPostgresFixture(t);
  if (!postgres) return;
  const base = createLocalStorageAdapter({ adapter_id: "s3-shaped-object-lock" });
  const providerReads = { count: 0 };
  let providerFinalized = false;
  let stagedDeleteCalls = 0;
  const {
    armCommittedObjectQuarantine: _arm,
    clearCommittedObjectQuarantine: _clear,
    getCommittedObjectQuarantine: _getQuarantine,
    quarantineCommittedObject: _quarantine,
    recordCommittedObjectQuarantine: _record,
    ...unquarantined
  } = base;
  const raw = Object.freeze({
    ...unquarantined,
    provider: "s3-shaped-test",
    finalizeObject(input) {
      const receipt = base.finalizeObject(input);
      providerFinalized = true;
      return receipt;
    },
    getObject(input) { providerReads.count += 1; return base.getObject(input); },
    statObject(input) { providerReads.count += 1; return base.statObject(input); },
    digestObject(input) {
      if (input?.session_id == null) providerReads.count += 1;
      return base.digestObject(input);
    },
    readObjectBounded(input) { providerReads.count += 1; return base.readObjectBounded(input); },
    deleteOrphan(input) {
      stagedDeleteCalls += 1;
      if (providerFinalized) {
        throw Object.assign(new Error("Object Lock retention blocks staged delete"), {
          safe_error_code: "DMS_S3_OBJECT_LOCK_STAGED_DELETE_BLOCKED",
        });
      }
      return base.deleteOrphan(input);
    },
    deleteCommittedObject() {
      throw Object.assign(new Error("Object Lock retention blocks delete"), {
        safe_error_code: "DMS_S3_OBJECT_LOCK_DELETE_BLOCKED",
      });
    },
  });
  const authority = await probedAuthority(postgres.appPool, raw.adapter_id);
  const guarded = createPostgresDmsConsumerStorage({ storage: raw, authority });
  const runtime = createPostgresDmsUploadRuntime({
    pool: postgres.appPool,
    storage: raw,
    committedStorage: guarded,
    completionDenyAuthority: authority,
    clock: () => new Date("2026-08-09T03:00:00.000Z"),
  });
  const phases = [];
  await assert.rejects(runtime.uploadDocument({
    document: {
      tenant_id: TENANT,
      matter_id: "matter-completion-object-lock",
      workspace_id: "workspace-completion-object-lock",
      document_id: "document-completion-object-lock",
      current_version_id: "version-completion-object-lock",
      title: "Signed agreement.pdf",
      mime_type: "application/pdf",
      permission_envelope_id: "permission-completion-object-lock",
      audit_trace_id: "audit-completion-object-lock",
    },
    bytes: BYTES,
    actor_id: "actor-completion-object-lock",
    idempotency_key: "completion-object-lock",
    object_id: OBJECT,
    session_id: SESSION,
    completion_authority: {
      schema_version: "law-firm-os.dms-completion-authority-contract.v1",
      provider: "docusign",
      tenant_id: TENANT,
      matter_id: "matter-completion-object-lock",
      workspace_id: "workspace-completion-object-lock",
      request_id: "request-completion-object-lock",
      envelope_id: "envelope-completion-object-lock",
      kind: "signed_pdf",
      sha256: SHA,
      object_id: OBJECT,
      idempotency_key: "completion-object-lock",
      permission_envelope_id: "permission-completion-object-lock",
      audit_trace_id: "audit-completion-object-lock",
      fencing_generation: 1,
    },
    beforePersist({ phase }) {
      phases.push(phase);
      if (phase === "before_metadata") {
        throw Object.assign(new Error("completion authority changed"), {
          completion_authority_rejection: true,
          safe_error_code: "DOCUSIGN_PERMISSION_AUTHORITY_CHANGED",
        });
      }
    },
  }), (error) => error?.safe_error_code === "DOCUSIGN_PERMISSION_AUTHORITY_CHANGED");
  assert.deepEqual(phases, ["before_session", "before_stage", "before_storage", "before_provider_finalize", "before_metadata"]);
  const session = await runtime.getUploadSession({ tenant_id: TENANT, session_id: SESSION });
  assert.deepEqual({
    state: session.state,
    retryable: session.retryable,
    cleanup_state: session.dead_letter_receipt?.cleanup_state,
    committed_object_deleted: session.dead_letter_receipt?.committed_object_deleted,
    provider_object_retained: session.dead_letter_receipt?.provider_object_retained,
    staged_object_retained: session.dead_letter_receipt?.staged_object_retained,
    staged_cleanup_error_code: session.dead_letter_receipt?.staged_cleanup_error_code,
    staged_delete_calls: stagedDeleteCalls,
  }, {
    state: "failed_terminal",
    retryable: false,
    cleanup_state: "logically_denied",
    committed_object_deleted: false,
    provider_object_retained: true,
    staged_object_retained: true,
    staged_cleanup_error_code: "DMS_S3_OBJECT_LOCK_STAGED_DELETE_BLOCKED",
    staged_delete_calls: 1,
  });
  assert.equal(await runtime.getDocumentState({ tenant_id: TENANT, document_id: "document-completion-object-lock" }), null);
  providerReads.count = 0;
  await assertConsumerDeny(guarded, providerReads);
  const restartAuthority = await probedAuthority(postgres.appPool, raw.adapter_id);
  const restarted = createPostgresDmsUploadRuntime({
    pool: postgres.appPool,
    storage: raw,
    committedStorage: createPostgresDmsConsumerStorage({ storage: raw, authority: restartAuthority }),
    completionDenyAuthority: restartAuthority,
  });
  assert.deepEqual(await restarted.reconcileUploadSessions({ tenant_id: TENANT }), []);
  await assertConsumerDeny(createPostgresDmsConsumerStorage({ storage: raw, authority: restartAuthority }), providerReads);
});
