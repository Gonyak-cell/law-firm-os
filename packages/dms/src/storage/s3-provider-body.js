import { ClientRequest, IncomingMessage } from "node:http";
import { DMS_STORAGE_BODY_UNBOUNDED } from "./bounded-storage-read.js";
import { boundedS3ResponseEvidence } from "./s3-bounded-http-handler.js";

function responseHeader(body, name) {
  const value = body.headers?.[name];
  return Array.isArray(value) ? value.join(",") : value;
}

function unboundedBodyError({ declaredByteSize } = {}) {
  const error = Object.assign(
    new TypeError("S3 response Body must be a bounded framed Node HTTP response"),
    { code: DMS_STORAGE_BODY_UNBOUNDED, observed_byte_size: 0 },
  );
  if (Number.isSafeInteger(declaredByteSize)) error.declared_byte_size = declaredByteSize;
  return error;
}

function assertFramedIncomingMessage(body, { contentLength, contentRange, declaredByteSize }) {
  const framedLength = responseHeader(body, "content-length");
  const framedRange = responseHeader(body, "content-range");
  const transport = boundedS3ResponseEvidence(body);
  if (!(body instanceof IncomingMessage)
      || !(body.req instanceof ClientRequest)
      || transport === null
      || transport.ceiling < contentLength
      || transport.observed_byte_size > transport.ceiling
      || transport.peak_buffered_byte_size > transport.ceiling
      || body.readableObjectMode === true
      || responseHeader(body, "transfer-encoding") !== undefined
      || framedLength !== String(contentLength)
      || framedRange !== String(contentRange)) {
    throw unboundedBodyError({ declaredByteSize });
  }
  return body;
}

export function assertS3ProviderBody(response, {
  declared_byte_size,
  content_length,
} = {}) {
  const body = response?.Body;
  return assertFramedIncomingMessage(body, {
    contentLength: content_length,
    contentRange: response?.ContentRange,
    declaredByteSize: declared_byte_size,
  });
}
