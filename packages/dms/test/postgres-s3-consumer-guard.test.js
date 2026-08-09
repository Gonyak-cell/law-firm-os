import assert from "node:assert/strict";
import { S3Client } from "@aws-sdk/client-s3";
import test from "node:test";
import { createMigratedPostgresFixture } from "../../persistence/test/helpers/disposable-postgres.js";
import {
  createPostgresDmsConsumerReadAuthority,
  createPostgresDmsConsumerStorage,
} from "../src/postgres-consumer-storage.js";
import { createPostgresDmsUploadRuntime } from "../src/postgres-upload-runtime.js";
import { createLocalStorageAdapter } from "../src/storage/local-storage-adapter.js";

const TENANT = "tenant-real-s3-consumer-guard";
const OBJECT = "object-real-s3-consumer-guard";

async function authority(pool, adapterId) {
  const result = createPostgresDmsConsumerReadAuthority({ pool });
  await result.probe({ tenant_id: TENANT, adapter_id: adapterId });
  return result;
}

async function assertAllReadsDenied(storage, objectId = OBJECT) {
  const input = { tenant_id: TENANT, object_id: objectId };
  for (const read of [
    () => storage.getObject(input),
    () => storage.statObject(input),
    () => storage.digestObject(input),
    () => storage.readObjectBounded({ ...input, max_bytes: 1024 }),
  ]) {
    await assert.rejects(read(), (error) => error?.safe_error_code === "DMS_COMMITTED_OBJECT_NOT_AUTHORIZED");
  }
}

test("DMS PostgreSQL guard blocks an actual S3 adapter before bounded client dispatch", async (t) => {
  const postgres = await createMigratedPostgresFixture(t);
  if (!postgres) return;
  const local = createLocalStorageAdapter({ adapter_id: "provider-gap-seed" });
  const writer = createPostgresDmsUploadRuntime({
    pool: postgres.appPool,
    storage: local,
    faultInjector(phase) {
      if (phase === "after_storage_finalize_before_session_finalized") {
        throw Object.assign(new Error("provider finalized gap"), { code: "LAWOS_TEST_PROVIDER_GAP" });
      }
    },
  });
  await assert.rejects(writer.uploadDocument({
    document: {
      tenant_id: TENANT,
      matter_id: "matter-real-s3-consumer-guard",
      workspace_id: "workspace-real-s3-consumer-guard",
      document_id: "document-real-s3-consumer-guard",
      current_version_id: "version-real-s3-consumer-guard",
      title: "Provider gap.txt",
      mime_type: "text/plain",
      permission_envelope_id: "permission-real-s3-consumer-guard",
      audit_trace_id: "audit-real-s3-consumer-guard",
    },
    bytes: Buffer.from("provider gap"),
    actor_id: "actor-real-s3-consumer-guard",
    idempotency_key: "real-s3-consumer-guard",
    object_id: OBJECT,
    session_id: "session-real-s3-consumer-guard",
  }), (error) => error?.code === "LAWOS_TEST_PROVIDER_GAP");

  let clientSendCalls = 0;
  const originalSend = S3Client.prototype.send;
  S3Client.prototype.send = async function blockedMockDispatch() {
    clientSendCalls += 1;
    throw new Error("bounded S3 mock must not dispatch");
  };
  t.after(() => { S3Client.prototype.send = originalSend; });
  const { createBoundedS3Client } = await import("../src/storage/s3-bounded-client.js");
  const { createS3StorageAdapter } = await import("../src/storage/s3-storage-adapter.js");
  const client = createBoundedS3Client({
    region: "ap-northeast-2",
    endpoint: "http://127.0.0.1:1",
    credentials: { accessKeyId: "mock", secretAccessKey: "mock" },
  });
  t.after(() => client.destroy());
  const s3 = createS3StorageAdapter({
    adapter_id: "actual-s3-consumer-guard",
    credential_ref: "aws-role:mock",
    bucket: "lawos-mock",
    expected_bucket_owner: "770880870480",
    prefix: "consumer-guard",
    client,
  });
  const guarded = createPostgresDmsConsumerStorage({ storage: s3, authority: await authority(postgres.appPool, s3.adapter_id) });
  await assertAllReadsDenied(guarded);
  await assertAllReadsDenied(guarded, "object-real-s3-untracked");
  const restarted = createPostgresDmsConsumerStorage({ storage: s3, authority: await authority(postgres.appPool, s3.adapter_id) });
  await assertAllReadsDenied(restarted);
  await assertAllReadsDenied(restarted, "object-real-s3-untracked");
  assert.equal(clientSendCalls, 0);
});
