import assert from "node:assert/strict";
import test from "node:test";
import { createLocalStorageAdapter } from "../../dms/src/storage/local-storage-adapter.js";
import { createPersonPhotoStorage } from "../src/person-photo-storage.js";
import { SYNTHETIC_PROFILE_PNG_BASE64 } from "../../../scripts/test/helpers/synthetic-private-runtime-sources.mjs";

const bytes = Buffer.from(SYNTHETIC_PROFILE_PNG_BASE64, "base64");
const input = { tenant_id: "tenant_synthetic", person_id: "person_external", bytes, content_type: "image/png", idempotency_key: "photo-1" };

test("Person photos are immutable, tenant/subject bound, verified PNGs outside HRX", async () => {
  const storage = createLocalStorageAdapter();
  const photos = createPersonPhotoStorage({ storage });
  const first = await photos.storePhoto(input);
  assert.equal(JSON.stringify(first).includes("object"), false);
  assert.equal(JSON.stringify(first).includes("base64"), false);
  assert.deepEqual(await photos.storePhoto(input), first);
  assert.deepEqual((await photos.readPhoto({ ...input, photo: first })).bytes, bytes);
  await assert.rejects(photos.readPhoto({ ...input, person_id: "another", photo: first }));
  await assert.rejects(photos.readPhoto({ ...input, tenant_id: "another", photo: first }));
  await assert.rejects(photos.readPhoto({ ...input, photo: { ...first, version_id: "forged" } }));
  const replacement = await photos.storePhoto({ ...input, bytes: Buffer.concat([bytes, Buffer.from("synthetic")]), idempotency_key: "photo-2" });
  assert.notEqual(first.sha256, replacement.sha256);
  assert.deepEqual((await photos.readPhoto({ ...input, photo: first })).bytes, bytes);
  for (const invalid of [
    { content_type: "image/jpeg" }, { person_id: "../other" }, { tenant_id: "../other" },
    { bytes: Buffer.from("not a PNG") }, { bytes: Buffer.alloc(5 * 1024 * 1024 + 1) },
  ]) await assert.rejects(photos.storePhoto({ ...input, ...invalid }));
});
