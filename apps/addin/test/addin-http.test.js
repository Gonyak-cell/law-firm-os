import assert from "node:assert/strict";
import test from "node:test";
import {
  DEFAULT_ADDIN_API_TIMEOUT_MS,
  fetchAddinApi,
} from "../src/addin-http.js";

test("Add-in API 요청은 method와 body를 유지하고 AbortSignal을 추가한다", async () => {
  const calls = [];
  const response = { ok: true };
  const result = await fetchAddinApi({
    url: "https://addin.example.invalid/api/outlook/bootstrap",
    options: { method: "POST", body: "{}" },
    fetchImpl: async (...args) => {
      calls.push(args);
      return response;
    },
  });
  assert.equal(result, response);
  assert.equal(calls[0][0], "https://addin.example.invalid/api/outlook/bootstrap");
  assert.equal(calls[0][1].method, "POST");
  assert.equal(calls[0][1].body, "{}");
  assert.equal(calls[0][1].signal.aborted, false);
  assert.equal(DEFAULT_ADDIN_API_TIMEOUT_MS, 45_000);
});

test("응답하지 않는 Add-in API 요청은 제한 시간 뒤 안전 코드로 중단한다", async () => {
  await assert.rejects(
    fetchAddinApi({
      url: "https://addin.example.invalid/api/outlook/bootstrap",
      fetchImpl: (_url, { signal }) => new Promise((_resolve, reject) => {
        signal.addEventListener("abort", () => reject(new Error("aborted")), { once: true });
      }),
      timeoutMs: 5,
    }),
    (error) => (
      error.safe_error_code === "ADDIN_API_REQUEST_TIMEOUT"
      && error.timeout_ms === 5
    ),
  );
});

test("네트워크 오류는 시간 초과로 바꾸지 않는다", async () => {
  const networkError = new Error("network unavailable");
  await assert.rejects(
    fetchAddinApi({
      url: "https://addin.example.invalid/api/outlook/bootstrap",
      fetchImpl: async () => { throw networkError; },
    }),
    (error) => error === networkError,
  );
});
