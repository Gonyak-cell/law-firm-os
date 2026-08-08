import { ClientRequest, IncomingMessage } from "node:http";
import {
  DMS_STORAGE_BODY_UNBOUNDED,
  storageObjectTooLargeError,
} from "./bounded-storage-read.js";

function directByteSize(body) {
  if (typeof body === "string") return Buffer.byteLength(body);
  if (Buffer.isBuffer(body)) return body.byteLength;
  if (body instanceof ArrayBuffer) return body.byteLength;
  if (ArrayBuffer.isView(body)) return body.byteLength;
  return null;
}

function responseHeader(body, name) {
  const value = body.headers?.[name];
  return Array.isArray(value) ? value.join(",") : value;
}

function unboundedBodyError({ declaredByteSize } = {}) {
  const error = Object.assign(
    new TypeError("S3 response Body must be an exact direct value or a framed Node HTTP response"),
    { code: DMS_STORAGE_BODY_UNBOUNDED, observed_byte_size: 0 },
  );
  if (Number.isSafeInteger(declaredByteSize)) error.declared_byte_size = declaredByteSize;
  return error;
}

function bodyMismatchError({ declaredByteSize, providerDeclaredByteSize, observedByteSize }) {
  const error = Object.assign(new Error("S3 response Body does not match its declared length"), {
    code: "DMS_S3_RANGE_INVALID",
    observed_byte_size: observedByteSize,
  });
  if (Number.isSafeInteger(declaredByteSize)) error.declared_byte_size = declaredByteSize;
  if (Number.isSafeInteger(providerDeclaredByteSize)) {
    error.provider_declared_byte_size = providerDeclaredByteSize;
  }
  return error;
}

function assertFramedIncomingMessage(body, { contentLength, contentRange, declaredByteSize }) {
  const framedLength = responseHeader(body, "content-length");
  const framedRange = responseHeader(body, "content-range");
  if (!(body instanceof IncomingMessage)
      || !(body.req instanceof ClientRequest)
      || body.readableObjectMode === true
      || responseHeader(body, "transfer-encoding") !== undefined
      || framedLength !== String(contentLength)
      || framedRange !== String(contentRange)) {
    throw unboundedBodyError({ declaredByteSize });
  }
  return body;
}

export function assertS3ProviderBody(response, {
  max_bytes,
  declared_byte_size,
  content_length,
} = {}) {
  const body = response?.Body;
  const measured = directByteSize(body);
  if (measured !== null) {
    if (measured > max_bytes) {
      throw storageObjectTooLargeError({
        max_bytes,
        declared_byte_size,
        observed_byte_size: measured,
      });
    }
    if (measured !== content_length) {
      throw bodyMismatchError({
        declaredByteSize: declared_byte_size,
        providerDeclaredByteSize: content_length,
        observedByteSize: measured,
      });
    }
    return body;
  }
  return assertFramedIncomingMessage(body, {
    contentLength: content_length,
    contentRange: response?.ContentRange,
    declaredByteSize: declared_byte_size,
  });
}
