import assert from "node:assert/strict";
import test from "node:test";
import { createLocalStorageAdapter } from "../../dms/src/storage/local-storage-adapter.js";
import {
  HRX_MEMBER_PHOTO_STORAGE_VERSION,
  createHrxMemberPhotoStorage,
} from "../src/member-photo-storage.js";

const PNG = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=",
  "base64",
);
const SCOPE = Object.freeze({
  tenant_id: "tenant-synthetic",
  legal_entity_id: "company-synthetic",
  employee_id: "employee-synthetic",
});

test("member photo storage binds PNG bytes to tenant, entity, employee, and digest", async () => {
  const base = createLocalStorageAdapter({ adapter_id: "member-photo-test" });
  const calls = { stage: 0, finalize: 0 };
  const storage = Object.freeze({
    ...base,
    stageObject(input) {
      calls.stage += 1;
      return base.stageObject(input);
    },
    finalizeObject(input) {
      calls.finalize += 1;
      return base.finalizeObject(input);
    },
  });
  const photos = createHrxMemberPhotoStorage({ storage });
  assert.equal(photos.schema_version, HRX_MEMBER_PHOTO_STORAGE_VERSION);
  const metadata = await photos.storePhoto({
    ...SCOPE,
    idempotency_key: "member-photo-import-001",
    bytes: PNG,
  });
  assert.match(metadata.photo_object_id, /^employee-photo:[a-f0-9]{64}$/u);
  assert.equal(metadata.photo_sha256.length, 64);
  assert.equal(metadata.photo_byte_size, PNG.byteLength);
  assert.equal(metadata.photo_content_type, "image/png");
  assert.doesNotMatch(
    metadata.photo_object_id,
    /tenant-synthetic|company-synthetic|employee-synthetic/u,
  );
  const readback = await photos.readPhoto({
    ...SCOPE,
    photo: metadata,
  });
  assert.equal(readback.bytes.equals(PNG), true);
  assert.equal(readback.sha256, metadata.photo_sha256);

  const replay = await photos.storePhoto({
    ...SCOPE,
    idempotency_key: "member-photo-import-001",
    bytes: PNG,
  });
  assert.deepEqual(replay, metadata);
  assert.deepEqual(calls, { stage: 1, finalize: 1 });
});

test("member photo storage rejects cross-entity reads before object storage access", async () => {
  const base = createLocalStorageAdapter({ adapter_id: "member-photo-scope-test" });
  let readCount = 0;
  const observed = Object.freeze({
    ...base,
    async readObjectBounded(input) {
      readCount += 1;
      return base.readObjectBounded(input);
    },
  });
  const photos = createHrxMemberPhotoStorage({ storage: observed });
  const metadata = await photos.storePhoto({
    ...SCOPE,
    idempotency_key: "member-photo-import-002",
    bytes: PNG,
  });
  await assert.rejects(
    photos.readPhoto({
      ...SCOPE,
      legal_entity_id: "company-other",
      photo: metadata,
    }),
    (error) => error?.safe_error_code === "HRX_MEMBER_PHOTO_SCOPE_MISMATCH"
      && error?.status === 403,
  );
  assert.equal(readCount, 0);
});

test("member photo storage rejects invalid bytes and digest drift before upload", async () => {
  const base = createLocalStorageAdapter({ adapter_id: "member-photo-invalid-test" });
  const photos = createHrxMemberPhotoStorage({ storage: base });
  await assert.rejects(
    photos.storePhoto({
      ...SCOPE,
      idempotency_key: "member-photo-import-003",
      bytes: Buffer.from("not-a-png"),
    }),
    (error) => error?.safe_error_code === "HRX_MEMBER_PHOTO_INVALID",
  );
  const oversized = Buffer.from(PNG);
  oversized.writeUInt32BE(100_000, 16);
  await assert.rejects(
    photos.storePhoto({
      ...SCOPE,
      idempotency_key: "member-photo-import-oversized",
      bytes: oversized,
    }),
    (error) => error?.safe_error_code === "HRX_MEMBER_PHOTO_INVALID",
  );
  await assert.rejects(
    photos.storePhoto({
      ...SCOPE,
      idempotency_key: "member-photo-import-004",
      bytes: PNG,
      expected_sha256: "f".repeat(64),
    }),
    (error) => error?.safe_error_code === "HRX_MEMBER_PHOTO_DIGEST_MISMATCH",
  );
});
