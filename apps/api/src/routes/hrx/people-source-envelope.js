import { createPeopleSourceEnvelope } from "../../../../../packages/hrx/src/people-source-envelope.js";

const SAFE_ERROR_CODE = /^[A-Z][A-Z0-9_]{2,80}$/;
const DEFAULT_SOURCE_ERROR = "PEOPLE_SOURCE_UNAVAILABLE";

function safeErrorCode(reason) {
  const candidate = reason && typeof reason === "object" ? reason.safe_error_code : null;
  return typeof candidate === "string" && SAFE_ERROR_CODE.test(candidate)
    ? candidate
    : DEFAULT_SOURCE_ERROR;
}

function hasFallback(source) {
  return Object.prototype.hasOwnProperty.call(source, "fallback");
}

export function buildPeopleSourceEnvelopeFromSettled({
  as_of,
  timezone = "Asia/Seoul",
  sources = [],
} = {}) {
  const data = {};
  const sourceStatus = sources.map((source) => {
    if (source?.result?.status === "fulfilled") {
      data[source.source] = source.result.value;
      return {
        source: source.source,
        state: "ok",
        last_success_at: source.last_success_at ?? as_of,
        stale_after: source.stale_after ?? null,
        safe_error_code: null,
      };
    }
    if (hasFallback(source)) {
      data[source.source] = source.fallback;
      return {
        source: source.source,
        state: "stale",
        last_success_at: source.last_success_at,
        stale_after: source.stale_after ?? null,
        safe_error_code: safeErrorCode(source?.result?.reason),
      };
    }
    return {
      source: source.source,
      state: "blocked",
      last_success_at: source.last_success_at ?? null,
      stale_after: source.stale_after ?? null,
      safe_error_code: safeErrorCode(source?.result?.reason),
    };
  });
  return createPeopleSourceEnvelope({
    as_of,
    timezone,
    source_status: sourceStatus,
    data,
  });
}

export async function readPeopleSourceEnvelope({
  as_of,
  timezone = "Asia/Seoul",
  sources = [],
} = {}) {
  const results = await Promise.allSettled(sources.map((source) => source.read()));
  return buildPeopleSourceEnvelopeFromSettled({
    as_of,
    timezone,
    sources: sources.map((source, index) => ({
      source: source.source,
      result: results[index],
      last_success_at: source.last_success_at,
      stale_after: source.stale_after,
      ...(hasFallback(source) ? { fallback: source.fallback } : {}),
    })),
  });
}
