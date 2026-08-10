import assert from "node:assert/strict";
import test from "node:test";
import { createMigratedPostgresFixture } from "../../persistence/test/helpers/disposable-postgres.js";
import {
  createPostgresDmsConsumerReadAuthority,
  createPostgresDmsConsumerStorage,
} from "../src/postgres-consumer-storage.js";
import { createPostgresDmsUploadRuntime } from "../src/postgres-upload-runtime.js";
import { createLocalStorageAdapter } from "../src/storage/local-storage-adapter.js";

const TENANT = "tenant-consumer-state-matrix";
const BYTES = Buffer.from("consumer state matrix bytes");

function uploadInput(suffix) {
  return {
    document: {
      tenant_id: TENANT,
      matter_id: `matter-${suffix}`,
      workspace_id: `workspace-${suffix}`,
      document_id: `document-${suffix}`,
      current_version_id: `version-${suffix}`,
      title: "State matrix.txt",
      mime_type: "text/plain",
      permission_envelope_id: `permission-${suffix}`,
      audit_trace_id: `audit-${suffix}`,
    },
    bytes: BYTES,
    actor_id: "actor-state-matrix",
    idempotency_key: `idempotency-${suffix}`,
    object_id: `object-${suffix}`,
    session_id: `session-${suffix}`,
  };
}

async function assertGuardedDeny(storage, providerCalls, objectId) {
  const input = { tenant_id: TENANT, object_id: objectId };
  const before = providerCalls.count;
  for (const read of [
    () => storage.getObject(input),
    () => storage.statObject(input),
    () => storage.digestObject(input),
    () => storage.readObjectBounded({ ...input, max_bytes: 1024 }),
  ]) {
    await assert.rejects(read(), (error) => error?.safe_error_code === "DMS_COMMITTED_OBJECT_NOT_AUTHORIZED");
  }
  assert.equal(providerCalls.count, before);
}

test("DMS PostgreSQL consumer authority denies provider-finalizing and permits only metadata-finalized objects", async (t) => {
  const postgres = await createMigratedPostgresFixture(t);
  if (!postgres) return;
  const base = createLocalStorageAdapter({ adapter_id: "s3-shaped-state-matrix" });
  const providerCalls = { count: 0 };
  let entered;
  const enteredPromise = new Promise((resolve) => { entered = resolve; });
  let release;
  const releasePromise = new Promise((resolve) => { release = resolve; });
  const raw = Object.freeze({
    ...base,
    provider: "s3-shaped-test",
    async finalizeObject(input) {
      entered();
      await releasePromise;
      return base.finalizeObject(input);
    },
    getObject(input) {
      providerCalls.count += 1;
      return base.getObject(input);
    },
    statObject(input) {
      providerCalls.count += 1;
      return base.statObject(input);
    },
    digestObject(input) {
      if (input?.session_id == null) providerCalls.count += 1;
      return base.digestObject(input);
    },
    readObjectBounded(input) {
      providerCalls.count += 1;
      return base.readObjectBounded(input);
    },
  });
  const authority = createPostgresDmsConsumerReadAuthority({ pool: postgres.appPool });
  assert.deepEqual(await authority.probe({ tenant_id: TENANT, adapter_id: raw.adapter_id }), {
    authority: "lawos-dms-postgres-consumer-read-v1",
    durable: true,
    deny_before_provider_io: true,
    probe_completed: true,
  });
  const guarded = createPostgresDmsConsumerStorage({ storage: raw, authority });
  const runtime = createPostgresDmsUploadRuntime({
    pool: postgres.appPool,
    storage: raw,
    committedStorage: guarded,
    completionDenyAuthority: authority,
  });
  const upload = runtime.uploadDocument(uploadInput("blocked"));
  await enteredPromise;
  assert.equal((await runtime.getUploadSession({ tenant_id: TENANT, session_id: "session-blocked" })).state, "provider_finalizing");
  providerCalls.count = 0;
  await assertGuardedDeny(guarded, providerCalls, "object-blocked");
  release();
  assert.equal((await upload).outcome, "created");
  assert.equal((await runtime.getUploadSession({ tenant_id: TENANT, session_id: "session-blocked" })).state, "finalized");

  providerCalls.count = 0;
  assert.equal((await guarded.getObject({ tenant_id: TENANT, object_id: "object-blocked" })).bytes.equals(BYTES), true);
  assert.equal((await guarded.statObject({ tenant_id: TENANT, object_id: "object-blocked" })).byte_size, BYTES.byteLength);
  assert.equal((await guarded.digestObject({ tenant_id: TENANT, object_id: "object-blocked" })).byte_size, BYTES.byteLength);
  assert.equal((await guarded.readObjectBounded({ tenant_id: TENANT, object_id: "object-blocked", max_bytes: 1024 })).bytes.equals(BYTES), true);
  assert.equal(providerCalls.count, 4);

  providerCalls.count = 0;
  const wrongAdapterGuard = createPostgresDmsConsumerStorage({
    storage: Object.freeze({ ...raw, adapter_id: "s3-shaped-wrong-adapter" }),
    authority,
  });
  await assertGuardedDeny(wrongAdapterGuard, providerCalls, "object-blocked");

  base.putObject({ tenant_id: TENANT, object_id: "payroll-untracked", bytes: BYTES });
  providerCalls.count = 0;
  await assertGuardedDeny(guarded, providerCalls, "payroll-untracked");
  assert.equal((await base.getObject({ tenant_id: TENANT, object_id: "payroll-untracked" })).bytes.equals(BYTES), true);
  const restartedAuthority = createPostgresDmsConsumerReadAuthority({ pool: postgres.appPool });
  await restartedAuthority.probe({ tenant_id: TENANT, adapter_id: raw.adapter_id });
  const restarted = createPostgresDmsConsumerStorage({
    storage: raw,
    authority: restartedAuthority,
  });
  assert.equal((await restarted.statObject({ tenant_id: TENANT, object_id: "object-blocked" })).byte_size, BYTES.byteLength);
  await assert.rejects(
    restarted.getObject({ tenant_id: "tenant-consumer-other", object_id: "object-blocked" }),
    (error) => !error.message.includes(BYTES.toString()),
  );
});
