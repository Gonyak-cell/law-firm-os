import { createHash } from "node:crypto";

export const DMS_STORAGE_OBJECT_TOO_LARGE = "DMS_STORAGE_OBJECT_TOO_LARGE";

export function storageReadLimit(value) {
  const limit = Number(value);
  if (!Number.isSafeInteger(limit) || limit < 0) {
    throw new TypeError("max_bytes must be a non-negative safe integer");
  }
  return limit;
}

export function storageObjectTooLargeError({ max_bytes, observed_byte_size } = {}) {
  const error = Object.assign(new Error("storage object exceeds bounded read limit"), {
    code: DMS_STORAGE_OBJECT_TOO_LARGE,
  });
  if (Number.isSafeInteger(max_bytes)) error.max_bytes = max_bytes;
  if (Number.isSafeInteger(observed_byte_size)) error.observed_byte_size = observed_byte_size;
  return error;
}

export function safelyRunStorageCleanup(action) {
  if (typeof action !== "function") return null;
  try {
    const result = action();
    if (typeof result?.catch === "function") void result.catch(() => undefined);
    return null;
  } catch (error) {
    return error;
  }
}

export function cleanupStorageBody(body) {
  const failures = [];
  for (const action of [
    typeof body?.destroy === "function" ? () => body.destroy() : null,
    typeof body?.cancel === "function" ? () => body.cancel() : null,
  ]) {
    const failure = safelyRunStorageCleanup(action);
    if (failure) failures.push(failure);
  }
  return Object.freeze(failures);
}

export function abortStorageBody(body, controller, reason) {
  const failures = [];
  if (controller && !controller.signal?.aborted) {
    const failure = safelyRunStorageCleanup(() => controller.abort(reason));
    if (failure) failures.push(failure);
  }
  failures.push(...cleanupStorageBody(body));
  return Object.freeze(failures);
}

function byteView(value) {
  if (Buffer.isBuffer(value)) return value;
  if (value instanceof ArrayBuffer) return Buffer.from(value);
  if (ArrayBuffer.isView(value)) {
    return Buffer.from(value.buffer, value.byteOffset, value.byteLength);
  }
  return null;
}

function observedOverflowSize(limit, priorSize, chunkSize) {
  if (limit === Number.MAX_SAFE_INTEGER) return limit;
  return Math.min(limit + 1, priorSize + chunkSize);
}

export async function readStorageBodyBounded(body, { max_bytes, onOverflow } = {}) {
  const limit = storageReadLimit(max_bytes);
  const overflow = (observedSize) => {
    const error = storageObjectTooLargeError({
      max_bytes: limit,
      observed_byte_size: observedSize,
    });
    cleanupStorageBody(body);
    safelyRunStorageCleanup(typeof onOverflow === "function" ? () => onOverflow(error) : null);
    throw error;
  };
  const finish = (chunks, byteSize, hash) => Object.freeze({
    bytes: Buffer.concat(chunks, byteSize),
    byte_size: byteSize,
    sha256: hash.digest("hex"),
  });
  const hash = createHash("sha256");
  if (typeof body === "string") {
    const byteSize = Buffer.byteLength(body);
    if (byteSize > limit) return overflow(observedOverflowSize(limit, 0, byteSize));
    const bytes = Buffer.from(body);
    hash.update(bytes);
    return finish([bytes], byteSize, hash);
  }
  const direct = byteView(body);
  if (direct) {
    if (direct.byteLength > limit) return overflow(observedOverflowSize(limit, 0, direct.byteLength));
    hash.update(direct);
    return finish([direct], direct.byteLength, hash);
  }
  if (!body || typeof body[Symbol.asyncIterator] !== "function") {
    throw Object.assign(new TypeError("storage response Body must be bytes, text, or an async byte stream"), {
      code: "DMS_STORAGE_BODY_UNREADABLE",
    });
  }
  const chunks = [];
  let byteSize = 0;
  for await (const chunk of body) {
    const view = typeof chunk === "string" ? null : byteView(chunk);
    const chunkSize = view?.byteLength ?? (typeof chunk === "string" ? Buffer.byteLength(chunk) : NaN);
    if (!Number.isSafeInteger(chunkSize)) {
      throw Object.assign(new TypeError("storage response stream yielded a non-byte chunk"), {
        code: "DMS_STORAGE_BODY_UNREADABLE",
      });
    }
    if (chunkSize > limit - byteSize) {
      return overflow(observedOverflowSize(limit, byteSize, chunkSize));
    }
    const bytes = view ?? Buffer.from(chunk);
    hash.update(bytes);
    chunks.push(Buffer.from(bytes));
    byteSize += chunkSize;
  }
  return finish(chunks, byteSize, hash);
}
