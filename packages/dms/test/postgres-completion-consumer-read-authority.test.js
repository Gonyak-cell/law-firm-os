import assert from "node:assert/strict";
import test from "node:test";
import { createMigratedPostgresFixture } from "../../persistence/test/helpers/disposable-postgres.js";
import { createPostgresDmsUploadRuntime } from "../src/postgres-upload-runtime.js";
import {
  createPostgresDmsConsumerReadAuthority,
  createPostgresDmsConsumerStorage,
} from "../src/postgres-consumer-storage.js";
import { createLocalStorageAdapter } from "../src/storage/local-storage-adapter.js";

const TENANT = "tenant-completion-consumer-read";
const BYTES = Buffer.from("completion bytes must remain denied before metadata");

async function probedAuthority(pool, adapterId) {
  const authority = createPostgresDmsConsumerReadAuthority({ pool });
  await authority.probe({ tenant_id: TENANT, adapter_id: adapterId });
  return authority;
}

function s3ShapedStorage() {
  const base = createLocalStorageAdapter({ adapter_id: "s3-shaped-completion" });
  const counters = { finalize: 0, committed_read: 0, delete_orphan: 0, delete_committed: 0 };
  const {
    armCommittedObjectQuarantine: _arm,
    clearCommittedObjectQuarantine: _clear,
    getCommittedObjectQuarantine: _getQuarantine,
    quarantineCommittedObject: _quarantine,
    recordCommittedObjectQuarantine: _record,
    ...unquarantined
  } = base;
  return Object.freeze({
    base,
    counters,
    storage: Object.freeze({
      ...unquarantined,
      provider: "s3-shaped-test",
      finalizeObject(input) {
        counters.finalize += 1;
        return base.finalizeObject(input);
      },
      statObject(input) {
        counters.committed_read += 1;
        return base.statObject(input);
      },
      digestObject(input) {
        if (input?.session_id == null) counters.committed_read += 1;
        return base.digestObject(input);
      },
      getObject(input) {
        counters.committed_read += 1;
        return base.getObject(input);
      },
      readObjectBounded(input) {
        counters.committed_read += 1;
        return base.readObjectBounded(input);
      },
      deleteOrphan(input) {
        counters.delete_orphan += 1;
        return base.deleteOrphan(input);
      },
      deleteCommittedObject(input) {
        counters.delete_committed += 1;
        return base.deleteCommittedObject(input);
      },
    }),
  });
}

function document(suffix) {
  return Object.freeze({
    tenant_id: TENANT,
    matter_id: `matter-${suffix}`,
    workspace_id: `workspace-${suffix}`,
    document_id: `document-${suffix}`,
    current_version_id: `version-${suffix}`,
    title: "Completion artifact.pdf",
    mime_type: "application/pdf",
    permission_envelope_id: `permission-${suffix}`,
    audit_trace_id: `audit-${suffix}`,
  });
}

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
    sha256: "f".repeat(64),
    object_id: `object-${suffix}`,
    idempotency_key: `completion-${suffix}`,
    permission_envelope_id: `permission-${suffix}`,
    audit_trace_id: `audit-${suffix}`,
    fencing_generation: 1,
  });
}

async function assertDeniedBeforeProvider(storage, counters, objectId) {
  const input = { tenant_id: TENANT, object_id: objectId };
  const before = counters.committed_read;
  for (const read of [
    () => storage.getObject(input),
    () => storage.statObject(input),
    () => storage.digestObject(input),
    () => storage.readObjectBounded({ ...input, max_bytes: 1024 }),
  ]) {
    await assert.rejects(read(), (error) => error?.safe_error_code === "DMS_COMMITTED_OBJECT_NOT_AUTHORIZED");
  }
  assert.equal(counters.committed_read, before);
}

test("OUTM-34 PostgreSQL completion rejects before S3 finalize and persists a restart-stable deny", async (t) => {
  const postgres = await createMigratedPostgresFixture(t);
  if (!postgres) return;
  const provider = s3ShapedStorage();
  const readAuthority = await probedAuthority(postgres.appPool, provider.storage.adapter_id);
  const committedStorage = createPostgresDmsConsumerStorage({ storage: provider.storage, authority: readAuthority });
  const runtime = createPostgresDmsUploadRuntime({
    pool: postgres.appPool,
    storage: provider.storage,
    committedStorage,
    completionDenyAuthority: readAuthority,
    clock: () => new Date("2026-08-09T02:00:00.000Z"),
  });
  const phases = [];
  let rejected = null;
  try {
    await runtime.uploadDocument({
      document: document("pre-finalize"),
      bytes: BYTES,
      actor_id: "actor-completion",
      idempotency_key: "completion-pre-finalize",
      object_id: "object-pre-finalize",
      session_id: "session-pre-finalize",
      completion_authority: completionAuthority("pre-finalize"),
      beforePersist({ phase }) {
        phases.push(phase);
        if (phase === "before_provider_finalize") {
          throw Object.assign(new Error("completion authority changed"), {
            completion_authority_rejection: true,
            safe_error_code: "DOCUSIGN_PERMISSION_AUTHORITY_CHANGED",
          });
        }
      },
    });
  } catch (error) {
    rejected = error;
  }
  const session = await runtime.getUploadSession({ tenant_id: TENANT, session_id: "session-pre-finalize" });
  assert.deepEqual({
    safe_error_code: rejected?.safe_error_code ?? null,
    phases,
    finalize_calls: provider.counters.finalize,
    committed_read_calls: provider.counters.committed_read,
    session_state: session.state,
    cleanup_state: session.dead_letter_receipt?.cleanup_state ?? null,
  }, {
    safe_error_code: "DOCUSIGN_PERMISSION_AUTHORITY_CHANGED",
    phases: ["before_session", "before_stage", "before_storage", "before_provider_finalize"],
    finalize_calls: 0,
    committed_read_calls: 0,
    session_state: "failed_terminal",
    cleanup_state: "deleted",
  });
  assert.deepEqual([provider.counters.delete_orphan, provider.counters.delete_committed], [1, 0]);
  await assertDeniedBeforeProvider(committedStorage, provider.counters, "object-pre-finalize");
  const restartAuthority = await probedAuthority(postgres.appPool, provider.storage.adapter_id);
  const restarted = createPostgresDmsUploadRuntime({
    pool: postgres.appPool,
    storage: provider.storage,
    committedStorage: createPostgresDmsConsumerStorage({
      storage: provider.storage,
      authority: restartAuthority,
    }),
    completionDenyAuthority: restartAuthority,
  });
  assert.deepEqual(await restarted.reconcileUploadSessions({ tenant_id: TENANT }), []);
});

test("OUTM-34 PostgreSQL consumer reads deny provider-finalized gaps before provider I/O across restart", async (t) => {
  const postgres = await createMigratedPostgresFixture(t);
  if (!postgres) return;
  const provider = s3ShapedStorage();
  const authority = await probedAuthority(postgres.appPool, provider.storage.adapter_id);
  const committedStorage = createPostgresDmsConsumerStorage({ storage: provider.storage, authority });
  const runtime = createPostgresDmsUploadRuntime({
    pool: postgres.appPool,
    storage: provider.storage,
    committedStorage,
    faultInjector(phase) {
      if (phase === "after_storage_finalize_before_session_finalized") {
        throw Object.assign(new Error("metadata gap"), { code: "LAWOS_TEST_PROVIDER_FINALIZED_GAP" });
      }
    },
  });
  await assert.rejects(runtime.uploadDocument({
    document: document("provider-gap"),
    bytes: BYTES,
    actor_id: "actor-completion",
    idempotency_key: "provider-gap",
    object_id: "object-provider-gap",
    session_id: "session-provider-gap",
  }), (error) => error?.code === "LAWOS_TEST_PROVIDER_FINALIZED_GAP");
  assert.equal((await runtime.getUploadSession({ tenant_id: TENANT, session_id: "session-provider-gap" })).state, "provider_finalized");
  provider.counters.committed_read = 0;
  await assertDeniedBeforeProvider(committedStorage, provider.counters, "object-provider-gap");
  const restartAuthority = await probedAuthority(postgres.appPool, provider.storage.adapter_id);
  const restartedStorage = createPostgresDmsConsumerStorage({
    storage: provider.storage,
    authority: restartAuthority,
  });
  await assertDeniedBeforeProvider(restartedStorage, provider.counters, "object-provider-gap");
});
