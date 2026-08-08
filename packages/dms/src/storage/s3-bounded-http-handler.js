import { request as httpRequest } from "node:http";
import { request as httpsRequest } from "node:https";
import { BoundedS3HttpRuntime } from "./s3-bounded-http-runtime.js";

const boundedResponses = new WeakMap();

function extendedEncode(value) {
  return encodeURIComponent(value).replace(/[!'()*]/gu, (character) => (
    `%${character.charCodeAt(0).toString(16).toUpperCase()}`
  ));
}

function requestPath(request) {
  const parts = [];
  for (let key of Object.keys(request.query ?? {}).sort()) {
    const value = request.query[key];
    key = extendedEncode(key);
    for (const entry of Array.isArray(value) ? value : [value]) {
      parts.push(entry || typeof entry === "string" ? `${key}=${extendedEncode(entry)}` : key);
    }
  }
  const query = parts.join("&");
  return `${request.path}${query ? `?${query}` : ""}`;
}

function rangeCeiling(request) {
  if (request.method !== "GET") return null;
  const range = request.headers?.range ?? request.headers?.Range;
  if (range === undefined) return null;
  const match = /^bytes=0-(\d+)$/u.exec(String(range));
  if (!match || !Number.isSafeInteger(Number(match[1]))
      || Number(match[1]) === Number.MAX_SAFE_INTEGER) {
    throw Object.assign(new TypeError("bounded S3 transport requires an exact zero-based Range"), {
      code: "DMS_S3_RANGE_INVALID",
      observed_byte_size: 0,
    });
  }
  return Object.freeze({ range: String(range), max_bytes: Number(match[1]), ceiling: Number(match[1]) + 1 });
}

function parsedContentRange(value) {
  const match = /^bytes (\d+)-(\d+)\/(\d+|\*)$/u.exec(String(value ?? ""));
  if (!match) return null;
  const start = Number(match[1]);
  const end = Number(match[2]);
  const total = match[3] === "*" ? null : Number(match[3]);
  if (![start, end].every(Number.isSafeInteger) || end < start
      || (total !== null && (!Number.isSafeInteger(total) || total < end + 1))) return null;
  return Object.freeze({ start, end, total, byte_size: end - start + 1 });
}

function framingError(response, bound) {
  const contentRange = parsedContentRange(response.headers["content-range"]);
  const contentLength = Number(response.headers["content-length"]);
  const validLength = Number.isSafeInteger(contentLength) && contentLength >= 0;
  const error = Object.assign(new Error("S3 bounded response framing is invalid"), {
    name: "DmsS3BoundedTransportError",
    code: response.statusCode === 206 ? "DMS_S3_RANGE_INVALID" : "DMS_S3_HTTP_ERROR",
    $fault: "client",
    $metadata: { httpStatusCode: response.statusCode },
    max_bytes: bound.max_bytes,
    observed_byte_size: Number(response.readableLength ?? 0),
  });
  if (validLength) error.provider_declared_byte_size = contentLength;
  const invalid = response.statusCode !== 206
    || response.headers["transfer-encoding"] !== undefined
    || !validLength
    || contentLength > bound.ceiling
    || contentRange === null
    || contentRange.start !== 0
    || contentRange.end > bound.max_bytes
    || contentRange.byte_size !== contentLength;
  return invalid ? error : null;
}

function waitForClose(target, closedField = "closed") {
  if (!target || target[closedField] === true) return Promise.resolve();
  return new Promise((resolve) => target.once("close", resolve));
}

async function rejectFramedResponse(response, error) {
  let discarded = 0;
  response.push = (chunk) => {
    if (chunk) discarded += Buffer.byteLength(chunk);
    return false;
  };
  const socket = response.socket;
  const responseClosed = waitForClose(response);
  const socketClosed = waitForClose(socket, "destroyed");
  response.destroy();
  await Promise.all([responseClosed, socketClosed]);
  error.provider_discarded_byte_size = discarded;
  error.residual_buffered_byte_size = Number(response.readableLength ?? 0);
  error.transport_cleanup_complete = response.closed === true
    && (!socket || socket.destroyed === true)
    && error.residual_buffered_byte_size === 0;
  return error;
}

async function closedRequestError(request, error) {
  const socket = request.socket;
  await Promise.all([
    waitForClose(request),
    waitForClose(socket, "destroyed"),
  ]);
  error.observed_byte_size ??= 0;
  error.transport_observed_byte_size ??= 0;
  error.residual_buffered_byte_size = 0;
  error.transport_cleanup_complete = request.closed === true
    && (!socket || socket.destroyed === true);
  return error;
}

function responseHeaders(headers) {
  return Object.fromEntries(Object.entries(headers).map(([name, value]) => [
    name,
    Array.isArray(value) ? value.join(",") : value,
  ]));
}

export function boundedS3ResponseEvidence(body) {
  return boundedResponses.get(body) ?? null;
}

export class BoundedS3NodeHttpHandler {
  #runtime;

  metadata = { handlerProtocol: "http/1.1" };

  constructor(options) {
    this.#runtime = new BoundedS3HttpRuntime(options);
  }

  destroy() {
    this.#runtime.destroy();
  }

  updateHttpClientConfig(key, value) {
    this.#runtime.updateHttpClientConfig(key, value);
  }

  httpHandlerConfigs() {
    return this.#runtime.httpHandlerConfigs();
  }

  async handle(request, options = {}) {
    const state = await this.#runtime.resolve();
    const bound = rangeCeiling(request);
    if (!bound) return state.delegate.handle(request, options);
    if (request.body !== undefined && request.body !== null) {
      throw new TypeError("bounded S3 GET must not have a request body");
    }
    if (options.abortSignal?.aborted) {
      throw Object.assign(new Error("Request aborted"), { name: "AbortError" });
    }
    return new Promise((resolve, reject) => {
      let rejectingResponse = false;
      let responseRejection = null;
      const isTls = request.protocol === "https:";
      const send = isTls ? httpsRequest : httpRequest;
      const requestAgent = isTls ? state.config.httpsAgent : state.config.httpAgent;
      const outgoing = send({
        agent: requestAgent,
        auth: request.username == null ? undefined : `${request.username}:${request.password ?? ""}`,
        headers: request.headers,
        host: String(request.hostname).replace(/^\[|\]$/gu, ""),
        method: request.method,
        path: requestPath(request),
        port: request.port,
      }, (incoming) => {
        clearRequestControls();
        const error = framingError(incoming, bound);
        if (error) {
          rejectingResponse = true;
          responseRejection = error;
          rejectFramedResponse(incoming, error).then(reject, (cleanupError) => {
            error.cleanup_failures = Object.freeze([{
              name: cleanupError?.name ?? "Error",
              code: cleanupError?.code ?? null,
            }]);
            reject(error);
          });
          return;
        }
        const evidence = {
          ceiling: bound.ceiling,
          observed_byte_size: Number(incoming.readableLength ?? 0),
          peak_buffered_byte_size: Number(incoming.readableLength ?? 0),
        };
        const push = incoming.push;
        incoming.push = function boundedPush(chunk, encoding) {
          const size = chunk ? Buffer.byteLength(chunk) : 0;
          evidence.observed_byte_size += size;
          if (evidence.observed_byte_size > evidence.ceiling) {
            this.destroy(Object.assign(new Error("S3 response exceeded its transport bound"), {
              code: "DMS_STORAGE_OBJECT_TOO_LARGE",
              observed_byte_size: evidence.observed_byte_size,
            }));
            return false;
          }
          const result = push.call(this, chunk, encoding);
          evidence.peak_buffered_byte_size = Math.max(
            evidence.peak_buffered_byte_size,
            Number(this.readableLength ?? 0),
          );
          return result;
        };
        boundedResponses.set(incoming, evidence);
        resolve({ response: {
          statusCode: incoming.statusCode ?? -1,
          reason: incoming.statusMessage,
          headers: responseHeaders(incoming.headers),
          body: incoming,
        } });
      });
      const clearRequestControls = this.#runtime.arm(outgoing, {
        agent: requestAgent,
        config: state.config,
        isTls,
        requestTimeout: options.requestTimeout,
      });
      outgoing.once("error", (error) => {
        if (!rejectingResponse) {
          closedRequestError(outgoing, error).then(reject);
          return;
        }
        responseRejection.transport_close_error = Object.freeze({
          name: error?.name ?? "Error",
          code: error?.code ?? null,
        });
      });
      const abort = () => outgoing.destroy(Object.assign(new Error("Request aborted"), { name: "AbortError" }));
      options.abortSignal?.addEventListener?.("abort", abort, { once: true });
      outgoing.once("close", () => options.abortSignal?.removeEventListener?.("abort", abort));
      outgoing.end();
    });
  }
}
