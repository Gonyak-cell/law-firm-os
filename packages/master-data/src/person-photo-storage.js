import { createHash } from "node:crypto";
import { assertBoundedStorageReader, assertStagedStorageAdapter, sha256Hex } from "../../dms/src/storage/storage-adapter.js";
import { assertValidHrxMemberPhotoPng, HRX_MEMBER_PHOTO_MAX_BYTES } from "../../hrx/src/member-photo-storage.js";
import { profileError } from "./person-profile-service.js";

export const PERSON_PHOTO_MAX_BYTES = HRX_MEMBER_PHOTO_MAX_BYTES;
const safeId = value => typeof value === "string" && /^[A-Za-z0-9][A-Za-z0-9._:-]{0,159}$/u.test(value);
const digest = value => createHash("sha256").update(JSON.stringify(value)).digest("hex");

export function createPersonPhotoStorage({ storage }) {
  assertStagedStorageAdapter(storage);
  assertBoundedStorageReader(storage);

  function scope(input, sha256) {
    if (!safeId(input.tenant_id) || !safeId(input.person_id) || !/^[a-f0-9]{64}$/u.test(sha256 ?? "")) throw profileError("PROFILE_PHOTO_INVALID");
    return { tenant_id: input.tenant_id, object_id: `person-photo:${digest([input.tenant_id, input.person_id, sha256])}` };
  }

  function metadata(receipt, sha256, size) {
    const version = receipt?.version_id ?? (storage.provider === "s3" ? null : `sha256:${sha256}`);
    if (receipt?.sha256 !== sha256 || receipt?.byte_size !== size || receipt?.mime_type !== "image/png"
      || typeof version !== "string" || !version || version.length > 1024) throw profileError("PROFILE_PHOTO_STORAGE_MISMATCH", 503);
    return { sha256, byte_size: size, content_type: "image/png", version_id: version };
  }

  async function storePhoto(input) {
    if (input.content_type !== "image/png" || !Buffer.isBuffer(input.bytes) || !safeId(input.idempotency_key)) throw profileError("PROFILE_PHOTO_INVALID");
    assertValidHrxMemberPhotoPng(input.bytes);
    const sha256 = sha256Hex(input.bytes);
    const ref = scope(input, sha256);
    const existing = await storage.statObject(ref);
    if (existing) return metadata(existing, sha256, input.bytes.length);
    const session_id = `person-photo-stage:${digest([input.tenant_id, input.person_id, input.idempotency_key, sha256])}`;
    try {
      const staged = await storage.stageObject({ ...ref, session_id, bytes: input.bytes, content_type: "image/png", expected_sha256: sha256 });
      if (staged.sha256 !== sha256 || staged.byte_size !== input.bytes.length) throw profileError("PROFILE_PHOTO_STORAGE_MISMATCH", 503);
      return metadata(await storage.finalizeObject({ ...ref, session_id }), sha256, input.bytes.length);
    } catch (error) {
      try { await storage.deleteOrphan({ ...ref, session_id }); } catch { /* A failed stage can be swept; committed versions are never deleted. */ }
      throw error;
    }
  }

  async function readPhoto(input) {
    const photo = input.photo;
    const ref = scope(input, photo?.sha256);
    if (photo.content_type !== "image/png" || !Number.isSafeInteger(photo.byte_size)
      || photo.byte_size < 33 || photo.byte_size > PERSON_PHOTO_MAX_BYTES) throw profileError("PROFILE_PHOTO_INVALID");
    const stored = metadata(await storage.statObject(ref), photo.sha256, photo.byte_size);
    if (stored.version_id !== photo.version_id) throw profileError("PROFILE_PHOTO_VERSION_MISMATCH", 503);
    const observed = await storage.readObjectBounded({ ...ref, max_bytes: PERSON_PHOTO_MAX_BYTES });
    const bytes = Buffer.from(observed.bytes);
    assertValidHrxMemberPhotoPng(bytes);
    if (sha256Hex(bytes) !== photo.sha256 || bytes.length !== photo.byte_size || observed.mime_type !== "image/png") throw profileError("PROFILE_PHOTO_STORAGE_MISMATCH", 503);
    return { bytes, content_type: "image/png", byte_size: bytes.length };
  }

  return Object.freeze({ storePhoto, readPhoto });
}
