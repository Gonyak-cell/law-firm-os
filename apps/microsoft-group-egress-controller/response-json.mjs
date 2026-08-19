import { Buffer } from "node:buffer";

import { fail } from "./contract.mjs";

const MAX_JSON_BYTES = 256 * 1024;

export function assertResponse(response) {
  if (!response || !Number.isInteger(response.status) || !response.headers) {
    fail("UPSTREAM_RESPONSE_INVALID", 502);
  }
  return response;
}

export async function readJson(response) {
  let declaredLength = Number.NaN;
  try {
    declaredLength = Number(response.headers?.get?.("content-length"));
  } catch {
    fail("UPSTREAM_RESPONSE_INVALID", 502);
  }
  if (Number.isFinite(declaredLength) && declaredLength > MAX_JSON_BYTES) {
    fail("UPSTREAM_RESPONSE_INVALID", 502);
  }
  const chunks = [];
  let total = 0;
  try {
    if (!response.body?.getReader) fail("UPSTREAM_RESPONSE_INVALID", 502);
    const reader = response.body.getReader();
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      total += value.byteLength;
      if (total > MAX_JSON_BYTES) {
        await reader.cancel();
        fail("UPSTREAM_RESPONSE_INVALID", 502);
      }
      chunks.push(Buffer.from(value));
    }
  } catch {
    fail("UPSTREAM_RESPONSE_INVALID", 502);
  }
  const bytes = Buffer.concat(chunks, total);
  try {
    return JSON.parse(bytes.toString("utf8"));
  } catch {
    fail("UPSTREAM_RESPONSE_INVALID", 502);
  }
}
