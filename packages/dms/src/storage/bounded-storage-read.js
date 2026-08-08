import { createHash } from "node:crypto";

export const DMS_STORAGE_OBJECT_TOO_LARGE = "DMS_STORAGE_OBJECT_TOO_LARGE";
export const DMS_STORAGE_BODY_UNBOUNDED = "DMS_STORAGE_BODY_UNBOUNDED";

export function storageReadLimit(value) {
  const limit = Number(value);
  if (!Number.isSafeInteger(limit) || limit < 0 || limit === Number.MAX_SAFE_INTEGER) {
    throw new TypeError("max_bytes must be a non-negative safe integer with room for an overflow sentinel");
  }
  return limit;
}

export function storageObjectTooLargeError({
  max_bytes,
  declared_byte_size,
  observed_byte_size,
} = {}) {
  const error = Object.assign(new Error("storage object exceeds bounded read limit"), {
    code: DMS_STORAGE_OBJECT_TOO_LARGE,
  });
  if (Number.isSafeInteger(max_bytes)) error.max_bytes = max_bytes;
  if (Number.isSafeInteger(declared_byte_size)) error.declared_byte_size = declared_byte_size;
  if (Number.isSafeInteger(observed_byte_size)) error.observed_byte_size = observed_byte_size;
  return error;
}

function cleanupFailureMetadata(error) {
  return Object.freeze({
    name: typeof error?.name === "string" ? error.name : "Error",
    code: typeof error?.code === "string" ? error.code : null,
  });
}

async function runCleanupActions(actions, primaryError) {
  const failures = [];
  for (const action of actions.filter((candidate) => typeof candidate === "function")) {
    try {
      await action();
    } catch (error) {
      failures.push(error);
    }
  }
  if (failures.length === 0) return;
  if (!primaryError) throw new AggregateError(failures, "storage body cleanup failed");
  primaryError.cleanup_failures = Object.freeze(failures.map(cleanupFailureMetadata));
}

export function cleanupStorageBody(body, primaryError) {
  return runCleanupActions([
    typeof body?.destroy === "function" ? () => body.destroy() : null,
    typeof body?.cancel === "function" ? () => body.cancel() : null,
  ], primaryError);
}

export function abortStorageBody(body, controller, primaryError) {
  return runCleanupActions([
    controller && !controller.signal?.aborted ? () => controller.abort(primaryError) : null,
    typeof body?.destroy === "function" ? () => body.destroy() : null,
    typeof body?.cancel === "function" ? () => body.cancel() : null,
  ], primaryError);
}

function byteView(value) {
  if (Buffer.isBuffer(value)) return value;
  if (value instanceof ArrayBuffer) return Buffer.from(value);
  if (ArrayBuffer.isView(value)) {
    return Buffer.from(value.buffer, value.byteOffset, value.byteLength);
  }
  return null;
}

function bodyEnded(body) {
  return body.readableEnded === true || body.closed === true
    || (body.destroyed === true && Number(body.readableLength ?? 0) === 0);
}

function waitForReadable(body) {
  if (bodyEnded(body)) return Promise.resolve("end");
  return new Promise((resolve, reject) => {
    const listeners = [
      ["readable", () => finish(resolve, "readable")],
      ["end", () => finish(resolve, "end")],
      ["close", () => finish(resolve, "end")],
      ["error", (error) => finish(reject, error)],
    ];
    const removeListeners = () => {
      for (const [event, listener] of listeners) body.removeListener(event, listener);
    };
    let settled = false;
    const finish = (settler, value) => {
      if (settled) return;
      settled = true;
      removeListeners();
      settler(value);
    };
    for (const [event, listener] of listeners) body.once(event, listener);
    if (bodyEnded(body)) finish(resolve, "end");
  });
}

function assertConcreteByteStream(body) {
  if (body && typeof body.read === "function" && typeof body.once === "function"
      && typeof body.removeListener === "function" && body.readableObjectMode !== true) return body;
  throw Object.assign(new TypeError("storage response Body must expose a bounded Node/AWS byte-stream interface"), {
    code: DMS_STORAGE_BODY_UNBOUNDED,
    observed_byte_size: 0,
  });
}

function finishRead(chunks, byteSize, hash) {
  return Object.freeze({
    bytes: Buffer.concat(chunks, byteSize),
    byte_size: byteSize,
    sha256: hash.digest("hex"),
  });
}

function actualObservedSize(priorSize, chunkSize) {
  const observed = priorSize + chunkSize;
  return Number.isSafeInteger(observed) ? observed : undefined;
}

export async function readStorageBodyBounded(body, { max_bytes } = {}) {
  const limit = storageReadLimit(max_bytes);
  const hash = createHash("sha256");
  if (typeof body === "string") {
    const byteSize = Buffer.byteLength(body);
    if (byteSize > limit) {
      throw storageObjectTooLargeError({ max_bytes: limit, observed_byte_size: byteSize });
    }
    const bytes = Buffer.from(body);
    hash.update(bytes);
    return finishRead([bytes], byteSize, hash);
  }
  const direct = byteView(body);
  if (direct) {
    if (direct.byteLength > limit) {
      throw storageObjectTooLargeError({ max_bytes: limit, observed_byte_size: direct.byteLength });
    }
    hash.update(direct);
    return finishRead([direct], direct.byteLength, hash);
  }
  const stream = assertConcreteByteStream(body);
  const ceiling = limit + 1;
  const chunks = [];
  let byteSize = 0;
  while (byteSize < ceiling) {
    const remaining = ceiling - byteSize;
    const buffered = Number(stream.readableLength);
    const requested = Number.isSafeInteger(buffered) && buffered > 0
      ? Math.min(remaining, buffered)
      : remaining;
    const chunk = stream.read(requested);
    if (chunk === null) {
      if (bodyEnded(stream) || await waitForReadable(stream) === "end") break;
      continue;
    }
    const view = typeof chunk === "string" ? Buffer.from(chunk) : byteView(chunk);
    if (!view) {
      throw Object.assign(new TypeError("storage response stream yielded a non-byte chunk"), {
        code: "DMS_STORAGE_BODY_UNREADABLE",
        observed_byte_size: byteSize,
      });
    }
    if (view.byteLength === 0) {
      if (bodyEnded(stream) || await waitForReadable(stream) === "end") break;
      continue;
    }
    if (view.byteLength > remaining) {
      throw storageObjectTooLargeError({
        max_bytes: limit,
        observed_byte_size: actualObservedSize(byteSize, view.byteLength),
      });
    }
    hash.update(view);
    chunks.push(Buffer.from(view));
    byteSize += view.byteLength;
  }
  if (byteSize > limit) {
    throw storageObjectTooLargeError({ max_bytes: limit, observed_byte_size: byteSize });
  }
  return finishRead(chunks, byteSize, hash);
}
