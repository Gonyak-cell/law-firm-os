import { GetObjectCommand } from "@aws-sdk/client-s3";
import {
  abortStorageBody,
  readStorageBodyBounded,
  safelyRunStorageCleanup,
  storageObjectTooLargeError,
  storageReadLimit,
} from "./bounded-storage-read.js";

function codedError(message, code) {
  return Object.assign(new Error(message), { code });
}

function parseContentRange(value) {
  const match = /^bytes (\d+)-(\d+)\/(\d+|\*)$/u.exec(String(value ?? ""));
  if (!match) throw codedError("S3 ranged response ContentRange is invalid", "DMS_S3_RANGE_INVALID");
  const start = Number(match[1]);
  const end = Number(match[2]);
  const total = match[3] === "*" ? null : Number(match[3]);
  if (!Number.isSafeInteger(start) || !Number.isSafeInteger(end) || end < start
      || (total !== null && (!Number.isSafeInteger(total) || total < end + 1))) {
    throw codedError("S3 ranged response ContentRange is invalid", "DMS_S3_RANGE_INVALID");
  }
  return Object.freeze({ start, end, total, byte_size: end - start + 1 });
}

function responseLength(response) {
  if (response.ContentLength === undefined || response.ContentLength === null) return null;
  const byteSize = Number(response.ContentLength);
  if (!Number.isSafeInteger(byteSize) || byteSize < 0) {
    throw codedError("S3 ranged response ContentLength is invalid", "DMS_S3_RANGE_INVALID");
  }
  return byteSize;
}

function validateRangedResponse(response, { declared, declaredMetadata, limit }) {
  const range = parseContentRange(response.ContentRange);
  const contentLength = responseLength(response);
  if (range.start !== 0 || range.end > limit || (contentLength !== null && contentLength > limit + 1)) {
    throw codedError("S3 provider exceeded the requested byte range", "DMS_S3_RANGE_INVALID");
  }
  if (contentLength !== null && contentLength !== range.byte_size) {
    throw codedError("S3 ranged response length does not match ContentRange", "DMS_S3_RANGE_INVALID");
  }
  const responseMetadata = response.Metadata ?? {};
  const metadataSize = Number(responseMetadata["lawos-byte-size"]);
  const impliedSizes = [range.byte_size, contentLength, range.total, metadataSize]
    .filter((value) => value !== null && value !== undefined && Number.isSafeInteger(value));
  if (impliedSizes.some((value) => value > limit)) {
    throw storageObjectTooLargeError({ max_bytes: limit, observed_byte_size: limit + 1 });
  }
  if (!Number.isSafeInteger(metadataSize) || metadataSize < 0) {
    throw codedError("S3 object byte-size metadata is invalid", "DMS_S3_METADATA_INVALID");
  }
  for (const field of ["lawos-tenant-ref", "lawos-object-ref", "lawos-sha256"]) {
    if (responseMetadata[field] !== declaredMetadata?.[field]) {
      throw codedError("S3 committed object metadata changed during bounded read", "DMS_COMMITTED_DIGEST_MISMATCH");
    }
  }
  if (metadataSize !== declared.byte_size
      || range.byte_size !== declared.byte_size
      || (range.total !== null && range.total !== declared.byte_size)) {
    throw codedError("S3 committed object size changed during bounded read", "DMS_COMMITTED_DIGEST_MISMATCH");
  }
  return Object.freeze({ mime_type: response.ContentType ?? declared.mime_type });
}

export async function readS3CommittedObjectBounded({
  adapter_id,
  client,
  common,
  key,
  tenant_id,
  object_id,
  max_bytes,
  declared,
  declared_metadata,
  is_not_found,
} = {}) {
  const limit = storageReadLimit(max_bytes);
  if (declared.byte_size > limit) {
    throw storageObjectTooLargeError({ max_bytes: limit, observed_byte_size: declared.byte_size });
  }
  const abortController = new AbortController();
  let response;
  try {
    response = await client.send(new GetObjectCommand({
      ...common,
      Key: key,
      ChecksumMode: "ENABLED",
      Range: `bytes=0-${limit}`,
    }), { abortSignal: abortController.signal });
  } catch (error) {
    if (is_not_found?.(error)) {
      throw codedError(`object not found: ${object_id}`, "DMS_COMMITTED_OBJECT_NOT_FOUND");
    }
    throw error;
  }
  let ranged;
  try {
    ranged = validateRangedResponse(response, {
      declared,
      declaredMetadata: declared_metadata,
      limit,
    });
  } catch (error) {
    abortStorageBody(response.Body, abortController, error);
    throw error;
  }
  let observed;
  try {
    observed = await readStorageBodyBounded(response.Body ?? Buffer.alloc(0), {
      max_bytes: limit,
      onOverflow: (error) => safelyRunStorageCleanup(() => abortController.abort(error)),
    });
  } catch (error) {
    abortStorageBody(response.Body, abortController, error);
    throw error;
  }
  if (observed.byte_size !== declared.byte_size || observed.sha256 !== declared.sha256) {
    const error = codedError(
      "S3 committed object metadata does not match observed bytes",
      "DMS_COMMITTED_DIGEST_MISMATCH",
    );
    abortStorageBody(response.Body, abortController, error);
    throw error;
  }
  return Object.freeze({
    adapter_id,
    tenant_id,
    object_id,
    ...observed,
    declared_sha256: declared.sha256,
    mime_type: ranged.mime_type,
  });
}
