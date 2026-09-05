import { createHash } from "node:crypto";
import { getS3StorageTarget } from "../../dms/src/storage/s3-storage-adapter.js";
import {
  assertBoundedStorageReader,
  assertStagedStorageAdapter,
  sha256Hex,
} from "../../dms/src/storage/storage-adapter.js";

const photoStorageTargets = new WeakMap();

export function getHrxMemberPhotoStorageTarget(photos) {
  return photoStorageTargets.get(photos);
}

export const HRX_MEMBER_PHOTO_STORAGE_VERSION =
  "law-firm-os.hrx-member-photo-storage.v1";
export const HRX_MEMBER_PHOTO_MAX_BYTES = 5 * 1024 * 1024;

const PNG_SIGNATURE = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
const PNG_IHDR = Buffer.from("IHDR");
const PNG_IHDR_LENGTH = 13;
const PNG_MINIMUM_HEADER_BYTES = 8 + 4 + 4 + PNG_IHDR_LENGTH + 4;
const MEMBER_PHOTO_MAX_DIMENSION = 4096;
const MEMBER_PHOTO_MAX_PIXELS = 16_000_000;
const SAFE_REF = /^[A-Za-z0-9_.:-]{1,160}$/u;
const SHA256 = /^[a-f0-9]{64}$/u;

function codedError(message, safeErrorCode, status = 422) {
  return Object.assign(new Error(message), {
    safe_error_code: safeErrorCode,
    status,
  });
}

function requiredRef(value, label) {
  const text = String(value ?? "").trim();
  if (!SAFE_REF.test(text)) throw new TypeError(`${label} is invalid`);
  return text;
}

function requiredDigest(value, label) {
  const text = String(value ?? "").trim();
  if (!SHA256.test(text)) throw new TypeError(`${label} is invalid`);
  return text;
}

function optionalOpaqueText(value, label) {
  if (value == null) return null;
  const text = String(value).trim();
  if (!text || text.length > 1024 || /[\u0000-\u001f\u007f]/u.test(text)) {
    throw new TypeError(`${label} is invalid`);
  }
  return text;
}

function bytesFrom(value) {
  if (Buffer.isBuffer(value) || value instanceof Uint8Array) {
    return Buffer.from(value);
  }
  throw new TypeError("member photo bytes must be a Buffer or Uint8Array");
}

export function assertValidHrxMemberPhotoPng(bytes) {
  const hasHeader = bytes.byteLength >= PNG_MINIMUM_HEADER_BYTES
    && bytes.readUInt32BE(8) === PNG_IHDR_LENGTH
    && bytes.subarray(12, 16).equals(PNG_IHDR);
  const width = hasHeader ? bytes.readUInt32BE(16) : 0;
  const height = hasHeader ? bytes.readUInt32BE(20) : 0;
  if (bytes.byteLength < PNG_MINIMUM_HEADER_BYTES
      || bytes.byteLength > HRX_MEMBER_PHOTO_MAX_BYTES
      || !bytes.subarray(0, PNG_SIGNATURE.byteLength).equals(PNG_SIGNATURE)
      || !hasHeader
      || width < 1
      || height < 1
      || width > MEMBER_PHOTO_MAX_DIMENSION
      || height > MEMBER_PHOTO_MAX_DIMENSION
      || width * height > MEMBER_PHOTO_MAX_PIXELS) {
    throw codedError(
      "member photo must be a bounded PNG image",
      "HRX_MEMBER_PHOTO_INVALID",
    );
  }
}

function scopedDigest(...values) {
  return createHash("sha256").update(values.join("\u0000")).digest("hex");
}

function photoObjectId({ tenantId, legalEntityId, employeeId, sha256 }) {
  return `employee-photo:${scopedDigest(
    HRX_MEMBER_PHOTO_STORAGE_VERSION,
    tenantId,
    legalEntityId,
    employeeId,
    sha256,
  )}`;
}

function photoSessionId({ tenantId, legalEntityId, employeeId, idempotencyKey }) {
  return `employee-photo-stage:${scopedDigest(
    HRX_MEMBER_PHOTO_STORAGE_VERSION,
    tenantId,
    legalEntityId,
    employeeId,
    idempotencyKey,
  )}`;
}

export function createHrxMemberPhotoMetadata(input = {}) {
  const scope = normalizeScope(input);
  const digest = requiredDigest(input.photo_sha256, "photo_sha256");
  const byteSize = Number(input.photo_byte_size);
  if (!Number.isSafeInteger(byteSize)
      || byteSize < PNG_MINIMUM_HEADER_BYTES
      || byteSize > HRX_MEMBER_PHOTO_MAX_BYTES) {
    throw new TypeError("photo_byte_size is invalid");
  }
  return Object.freeze({
    photo_object_id: photoObjectId({ ...scope, sha256: digest }),
    photo_sha256: digest,
    photo_byte_size: byteSize,
    photo_content_type: "image/png",
    photo_version_id: optionalOpaqueText(
      input.photo_version_id,
      "photo_version_id",
    ),
  });
}

function normalizeScope(input = {}) {
  return Object.freeze({
    tenantId: requiredRef(input.tenant_id, "tenant_id"),
    legalEntityId: requiredRef(input.legal_entity_id, "legal_entity_id"),
    employeeId: requiredRef(input.employee_id, "employee_id"),
  });
}

function internalPhotoMetadata(receipt, expected) {
  if (receipt.sha256 !== expected.sha256
      || receipt.byte_size !== expected.byteSize
      || receipt.mime_type !== "image/png") {
    throw codedError(
      "member photo storage receipt does not match staged bytes",
      "HRX_MEMBER_PHOTO_STORAGE_MISMATCH",
    );
  }
  const metadata = createHrxMemberPhotoMetadata({
    tenant_id: expected.tenantId,
    legal_entity_id: expected.legalEntityId,
    employee_id: expected.employeeId,
    photo_sha256: expected.sha256,
    photo_byte_size: expected.byteSize,
    photo_version_id: receipt.version_id ?? null,
  });
  if (metadata.photo_object_id !== expected.objectId) {
    throw codedError(
      "member photo storage scope changed before finalize",
      "HRX_MEMBER_PHOTO_SCOPE_MISMATCH",
      403,
    );
  }
  return metadata;
}

export function createHrxMemberPhotoStorage({ storage } = {}) {
  const stagedStorage = assertStagedStorageAdapter(storage);
  const boundedStorage = assertBoundedStorageReader(storage);

  async function stagePhoto(input = {}) {
    const scope = normalizeScope(input);
    const idempotencyKey = requiredRef(input.idempotency_key, "idempotency_key");
    const bytes = bytesFrom(input.bytes);
    assertValidHrxMemberPhotoPng(bytes);
    const digest = sha256Hex(bytes);
    if (input.expected_sha256 != null
        && requiredDigest(input.expected_sha256, "expected_sha256") !== digest) {
      throw codedError(
        "member photo digest does not match the approved source",
        "HRX_MEMBER_PHOTO_DIGEST_MISMATCH",
      );
    }
    const objectId = photoObjectId({ ...scope, sha256: digest });
    const sessionId = photoSessionId({
      ...scope,
      idempotencyKey,
    });
    const receipt = await stagedStorage.stageObject({
      tenant_id: scope.tenantId,
      session_id: sessionId,
      object_id: objectId,
      bytes,
      content_type: "image/png",
      expected_sha256: digest,
    });
    if (receipt.sha256 !== digest || receipt.byte_size !== bytes.byteLength) {
      throw codedError(
        "member photo stage receipt is invalid",
        "HRX_MEMBER_PHOTO_STORAGE_MISMATCH",
      );
    }
    return Object.freeze({
      tenant_id: scope.tenantId,
      legal_entity_id: scope.legalEntityId,
      employee_id: scope.employeeId,
      session_id: sessionId,
      object_id: objectId,
      sha256: digest,
      byte_size: bytes.byteLength,
      content_type: "image/png",
      raw_path_exposed: false,
      bytes_exposed: false,
    });
  }

  async function finalizePhoto(staged = {}) {
    const scope = normalizeScope(staged);
    const sha256 = requiredDigest(staged.sha256, "sha256");
    const objectId = photoObjectId({ ...scope, sha256 });
    if (staged.object_id !== objectId) {
      throw codedError(
        "member photo staged scope does not match the requested scope",
        "HRX_MEMBER_PHOTO_SCOPE_MISMATCH",
        403,
      );
    }
    const sessionId = requiredRef(staged.session_id, "session_id");
    const receipt = await stagedStorage.finalizeObject({
      tenant_id: scope.tenantId,
      session_id: sessionId,
      object_id: objectId,
    });
    return internalPhotoMetadata(receipt, {
      ...scope,
      objectId,
      sha256,
      byteSize: Number(staged.byte_size),
    });
  }

  async function storePhoto(input = {}) {
    const scope = normalizeScope(input);
    const bytes = bytesFrom(input.bytes);
    assertValidHrxMemberPhotoPng(bytes);
    const digest = sha256Hex(bytes);
    if (input.expected_sha256 != null
        && requiredDigest(input.expected_sha256, "expected_sha256") !== digest) {
      throw codedError(
        "member photo digest does not match the approved source",
        "HRX_MEMBER_PHOTO_DIGEST_MISMATCH",
      );
    }
    const objectId = photoObjectId({ ...scope, sha256: digest });
    const committed = await stagedStorage.statObject({
      tenant_id: scope.tenantId,
      object_id: objectId,
    });
    if (committed) {
      return internalPhotoMetadata(committed, {
        ...scope,
        objectId,
        sha256: digest,
        byteSize: bytes.byteLength,
      });
    }
    const staged = await stagePhoto(input);
    try {
      return await finalizePhoto(staged);
    } catch (error) {
      const failure = error instanceof Error
        ? error
        : new Error("member photo finalize failed");
      try {
        failure.staged_cleanup = await deleteStagedPhoto(staged);
      } catch {
        failure.staged_cleanup = Object.freeze({
          deleted: false,
          committed_object_deleted: false,
          cleanup_failed: true,
        });
      }
      throw failure;
    }
  }

  async function deleteStagedPhoto(staged = {}) {
    const scope = normalizeScope(staged);
    const sha256 = requiredDigest(staged.sha256, "sha256");
    const objectId = photoObjectId({ ...scope, sha256 });
    if (staged.object_id !== objectId) {
      throw codedError(
        "member photo staged scope does not match the requested scope",
        "HRX_MEMBER_PHOTO_SCOPE_MISMATCH",
        403,
      );
    }
    return stagedStorage.deleteOrphan({
      tenant_id: scope.tenantId,
      session_id: requiredRef(staged.session_id, "session_id"),
      object_id: objectId,
    });
  }

  async function readPhoto(input = {}) {
    const scope = normalizeScope(input);
    const photo = input.photo;
    if (!photo || typeof photo !== "object" || Array.isArray(photo)) {
      throw new TypeError("member photo metadata is required");
    }
    const digest = requiredDigest(photo.photo_sha256, "photo_sha256");
    const expectedObjectId = photoObjectId({ ...scope, sha256: digest });
    if (photo.photo_object_id !== expectedObjectId) {
      throw codedError(
        "member photo metadata is outside the requested scope",
        "HRX_MEMBER_PHOTO_SCOPE_MISMATCH",
        403,
      );
    }
    const expectedByteSize = Number(photo.photo_byte_size);
    if (!Number.isSafeInteger(expectedByteSize)
        || expectedByteSize < PNG_MINIMUM_HEADER_BYTES
        || expectedByteSize > HRX_MEMBER_PHOTO_MAX_BYTES
        || photo.photo_content_type !== "image/png") {
      throw codedError(
        "member photo metadata is invalid",
        "HRX_MEMBER_PHOTO_METADATA_INVALID",
      );
    }
    const committed = await boundedStorage.statObject({
      tenant_id: scope.tenantId,
      object_id: expectedObjectId,
    });
    if (!committed) {
      throw codedError(
        "member photo object was not found",
        "HRX_MEMBER_PHOTO_NOT_FOUND",
        404,
      );
    }
    const current = internalPhotoMetadata(committed, {
      ...scope,
      objectId: expectedObjectId,
      sha256: digest,
      byteSize: expectedByteSize,
    });
    if (photo.photo_version_id != null
        && current.photo_version_id !== photo.photo_version_id) {
      throw codedError(
        "member photo object version does not match PostgreSQL metadata",
        "HRX_MEMBER_PHOTO_VERSION_MISMATCH",
      );
    }
    const observed = await boundedStorage.readObjectBounded({
      tenant_id: scope.tenantId,
      object_id: expectedObjectId,
      max_bytes: HRX_MEMBER_PHOTO_MAX_BYTES,
    });
    const bytes = bytesFrom(observed.bytes);
    assertValidHrxMemberPhotoPng(bytes);
    if (observed.sha256 !== digest
        || observed.byte_size !== expectedByteSize
        || observed.mime_type !== "image/png") {
      throw codedError(
        "member photo readback does not match its PostgreSQL metadata",
        "HRX_MEMBER_PHOTO_READBACK_MISMATCH",
      );
    }
    return Object.freeze({
      bytes,
      sha256: digest,
      byte_size: expectedByteSize,
      content_type: "image/png",
      raw_path_exposed: false,
    });
  }

  const target = stagedStorage.provider === "s3" ? getS3StorageTarget(stagedStorage) : null;
  const photos = Object.freeze({
    schema_version: HRX_MEMBER_PHOTO_STORAGE_VERSION,
    storage_target: target,
    storage_provider: stagedStorage.provider ?? "non-production",
    storage_adapter_id: stagedStorage.adapter_id,
    stagePhoto,
    finalizePhoto,
    storePhoto,
    deleteStagedPhoto,
    readPhoto,
  });
  photoStorageTargets.set(photos, target);
  return photos;
}
