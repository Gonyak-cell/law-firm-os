import assert from "node:assert/strict";
import test from "node:test";
import * as dms from "../src/index.js";
import { assertStagedStorageAdapter, sha256Hex } from "../src/storage/storage-adapter.js";
import { adapter, fakeS3Client } from "./s3-storage-adapter-test-helpers.js";

test("test-only S3 client injection is absent from the package API", () => {
  assert.equal("createS3StorageAdapterForTest" in dms, false);
});

test("S3 adapter stages, independently digests, finalizes, and isolates tenants", async () => {
  const storage = adapter();
  assertStagedStorageAdapter(storage);
  const kmsStorage = adapter({
    kms_key_id: "alias/lawos-test-dms",
  });
  assert.equal(kmsStorage.kms_key_ref, "alias/lawos-test-dms");
  assert.equal(kmsStorage.server_side_encryption, "aws:kms");
  assert.equal(storage.kms_key_ref, null);
  assert.equal(storage.server_side_encryption, "AES256");
  const shared = { session_id: "session-shared", object_id: "object-shared", content_type: "text/plain" };
  const bytesA = Buffer.from("tenant A bytes");
  const bytesB = Buffer.from("tenant B bytes");
  await storage.stageObject({ tenant_id: "tenant-a", ...shared, bytes: bytesA, expected_sha256: sha256Hex(bytesA) });
  await storage.stageObject({ tenant_id: "tenant-b", ...shared, bytes: bytesB, expected_sha256: sha256Hex(bytesB) });
  assert.equal((await storage.digestObject({ tenant_id: "tenant-a", ...shared })).sha256, sha256Hex(bytesA));
  assert.equal((await storage.digestObject({ tenant_id: "tenant-b", ...shared })).sha256, sha256Hex(bytesB));
  await storage.finalizeObject({ tenant_id: "tenant-a", ...shared });
  await storage.finalizeObject({ tenant_id: "tenant-b", ...shared });
  assert.equal((await storage.getObject({ tenant_id: "tenant-a", object_id: shared.object_id })).bytes.toString(), "tenant A bytes");
  assert.equal((await storage.getObject({ tenant_id: "tenant-b", object_id: shared.object_id })).bytes.toString(), "tenant B bytes");
  assert.equal(await storage.statStagedObject({ tenant_id: "tenant-a", ...shared }), null);
});

test("S3 adapter enforces stage idempotency and digest-conditional committed delete", async () => {
  const storage = adapter();
  const input = { tenant_id: "tenant-a", session_id: "session-a", object_id: "object-a", bytes: Buffer.from("first") };
  await storage.stageObject(input);
  await assert.rejects(storage.stageObject({ ...input, bytes: Buffer.from("different") }), (error) => error?.code === "DMS_STAGE_IDEMPOTENCY_CONFLICT");
  const committed = await storage.finalizeObject(input);
  await assert.rejects(
    storage.deleteCommittedObject({ tenant_id: input.tenant_id, object_id: input.object_id, expected_sha256: sha256Hex("wrong") }),
    (error) => error?.code === "DMS_COMMITTED_DELETE_CONDITION_FAILED",
  );
  assert.equal((await storage.deleteCommittedObject({ tenant_id: input.tenant_id, object_id: input.object_id, expected_sha256: committed.sha256 })).deleted, true);
  assert.equal((await storage.deleteCommittedObject({ tenant_id: input.tenant_id, object_id: input.object_id, expected_sha256: committed.sha256 })).already_absent, true);
});

test("S3 adapter never overwrites a concurrent finalize from another session", async () => {
  const storage = adapter();
  const shared = { tenant_id: "tenant-a", object_id: "object-concurrent" };
  await storage.stageObject({ ...shared, session_id: "session-a", bytes: Buffer.from("first") });
  await storage.stageObject({ ...shared, session_id: "session-b", bytes: Buffer.from("second") });
  const outcomes = await Promise.allSettled([
    storage.finalizeObject({ ...shared, session_id: "session-a" }),
    storage.finalizeObject({ ...shared, session_id: "session-b" }),
  ]);
  assert.equal(outcomes.filter((outcome) => outcome.status === "fulfilled").length, 1);
  const rejection = outcomes.find((outcome) => outcome.status === "rejected");
  assert.equal(rejection.reason?.code, "DMS_FINALIZE_CONFLICT");
  const committed = await storage.getObject(shared);
  assert.ok(["first", "second"].includes(committed.bytes.toString()));
});

test("S3 adapter round-trips provider legal hold and retention without accepting secrets", async () => {
  assert.throws(() => adapter({ access_key_id: "must-not-be-accepted" }), /credential_ref only/);
  const storage = adapter();
  await storage.putObject({ tenant_id: "tenant-a", object_id: "held-object", bytes: "held" });
  assert.deepEqual(await storage.getObjectLegalHold({ tenant_id: "tenant-a", object_id: "held-object" }), {
    status: "OFF",
    version_id: "v2",
  });
  assert.deepEqual(await storage.getObjectRetention({ tenant_id: "tenant-a", object_id: "held-object" }), {
    mode: null,
    retain_until: null,
    version_id: "v2",
  });
  assert.equal((await storage.setObjectLegalHold({ tenant_id: "tenant-a", object_id: "held-object" })).status, "ON");
  assert.equal((await storage.getObjectLegalHold({ tenant_id: "tenant-a", object_id: "held-object" })).status, "ON");
  const retainUntil = "2026-08-01T00:00:00.000Z";
  await storage.setObjectRetention({ tenant_id: "tenant-a", object_id: "held-object", retain_until: retainUntil });
  assert.deepEqual(await storage.getObjectRetention({ tenant_id: "tenant-a", object_id: "held-object" }), {
    mode: "GOVERNANCE",
    retain_until: retainUntil,
    version_id: "v2",
  });
});

test("S3 adapter applies default retention only after commit so staged cleanup remains possible", async () => {
  const storage = adapter({
    default_retention_days: 7,
    clock: () => new Date("2026-07-20T00:00:00.000Z"),
  });
  const input = { tenant_id: "tenant-a", session_id: "session-retained", object_id: "object-retained", bytes: "retained" };
  await storage.stageObject(input);
  const committed = await storage.finalizeObject(input);
  assert.equal(committed.default_retention_applied, true);
  assert.deepEqual(await storage.getObjectRetention({ tenant_id: input.tenant_id, object_id: input.object_id }), {
    mode: "GOVERNANCE",
    retain_until: "2026-07-27T00:00:00.000Z",
    version_id: committed.version_id,
  });
  assert.equal(await storage.statStagedObject(input), null);
  await storage.setObjectRetention({
    tenant_id: input.tenant_id,
    object_id: input.object_id,
    retain_until: "2026-08-20T00:00:00.000Z",
  });
  assert.equal((await storage.getObjectRetention({ tenant_id: input.tenant_id, object_id: input.object_id })).retain_until, "2026-08-20T00:00:00.000Z");
});

test("S3 adapter defers staged cleanup when bucket-default retention protects the staged copy", async () => {
  let now = new Date("2026-07-20T00:00:00.000Z");
  const client = fakeS3Client({
    defaultRetentionUntil: "2027-07-20T00:00:00.000Z",
    now: () => now,
  });
  const storage = adapter({
    client,
    default_retention_days: 7,
    clock: () => now,
  });
  const input = {
    tenant_id: "tenant-a",
    session_id: "session-staged-retention",
    object_id: "object-staged-retention",
    bytes: "retained staging copy",
  };
  await storage.stageObject(input);
  const committed = await storage.finalizeObject(input);
  assert.equal(committed.staged_cleanup_deferred, true);
  assert.notEqual(await storage.statStagedObject(input), null);
  assert.notEqual(await storage.statObject(input), null);
  now = new Date("2027-07-21T00:00:00.000Z");
  const cleaned = await storage.finalizeObject(input);
  assert.equal(cleaned.staged_cleanup_deferred, false);
  assert.equal(await storage.statStagedObject(input), null);
});

test("S3 adapter does not hide an unrelated staged delete denial", async () => {
  const storage = adapter({ client: fakeS3Client({ failDeleteOnce: true }) });
  const input = {
    tenant_id: "tenant-a",
    session_id: "session-delete-denied",
    object_id: "object-delete-denied",
    bytes: "delete denied",
  };
  await storage.stageObject(input);
  await assert.rejects(storage.finalizeObject(input), /synthetic delete denial/u);
});

test("S3 adapter repairs retention before staged cleanup after a partial finalize failure", async () => {
  const client = fakeS3Client({ failRetentionOnce: true });
  const storage = adapter({
    client,
    default_retention_days: 7,
    clock: () => new Date("2026-07-20T00:00:00.000Z"),
  });
  const input = { tenant_id: "tenant-a", session_id: "session-repair", object_id: "object-repair", bytes: "retained" };
  await storage.stageObject(input);
  await assert.rejects(storage.finalizeObject(input), /synthetic retention failure/u);
  assert.notEqual(await storage.statStagedObject(input), null);
  const committed = await storage.finalizeObject(input);
  assert.equal(committed.default_retention_applied, true);
  assert.deepEqual(await storage.getObjectRetention({ tenant_id: input.tenant_id, object_id: input.object_id }), {
    mode: "GOVERNANCE",
    retain_until: "2026-07-27T00:00:00.000Z",
    version_id: committed.version_id,
  });
  assert.equal(await storage.statStagedObject(input), null);
});

test("S3 adapter repairs missing retention even when staged cleanup already occurred", async () => {
  const client = fakeS3Client({ failRetentionOnce: true });
  const storage = adapter({
    client,
    default_retention_days: 7,
    clock: () => new Date("2026-07-20T00:00:00.000Z"),
  });
  const input = { tenant_id: "tenant-a", session_id: "session-cleanup-gap", object_id: "object-cleanup-gap", bytes: "retained" };
  await storage.stageObject(input);
  await assert.rejects(storage.finalizeObject(input), /synthetic retention failure/u);
  await storage.deleteOrphan(input);
  const committed = await storage.finalizeObject(input);
  assert.equal(committed.default_retention_applied, true);
  assert.equal((await storage.getObjectRetention({ tenant_id: input.tenant_id, object_id: input.object_id })).retain_until, "2026-07-27T00:00:00.000Z");
});
