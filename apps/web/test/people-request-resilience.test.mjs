import assert from "node:assert/strict";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";
import { createServer } from "vite";

const testDir = dirname(fileURLToPath(import.meta.url));
const webRoot = resolve(testDir, "..");

async function withClient(callback) {
  const server = await createServer({
    root: webRoot,
    appType: "custom",
    logLevel: "silent",
    server: { middlewareMode: true },
  });
  try {
    return await callback(await server.ssrLoadModule("/src/people/hrxApiClient.ts"));
  } finally {
    await server.close();
  }
}

function desktopWindow(api) {
  return {
    location: { protocol: "file:", search: "?desktop=1" },
    matterSession: { api },
  };
}

test("People member reads turn rejected desktop bridge calls into safe settled errors", async () => {
  const originalWindow = globalThis.window;
  const paths = [];
  globalThis.window = desktopWindow(({ path }) => {
    paths.push(path);
    return Promise.reject(new Error("desktop IPC unavailable"));
  });
  try {
    await withClient(async ({ fetchPeopleDailyBrief, fetchPeopleOutlookConnection }) => {
      const [daily, outlook] = await Promise.all([
        fetchPeopleDailyBrief("emp-1"),
        fetchPeopleOutlookConnection("emp-1"),
      ]);
      assert.deepEqual(
        [daily.kind, daily.status, daily.reason],
        ["error", null, "network_or_parse_error"],
      );
      assert.deepEqual(
        [outlook.kind, outlook.status, outlook.reason],
        ["error", null, "network_or_parse_error"],
      );
      assert.deepEqual(paths.sort(), [
        "/api/hrx/people/members/emp-1/daily-brief",
        "/api/hrx/people/members/emp-1/outlook-connection",
      ]);
    });
  } finally {
    globalThis.window = originalWindow;
  }
});

test("People member reads abort a stalled desktop bridge at the bounded timeout", async () => {
  const originalWindow = globalThis.window;
  const originalTimeout = AbortSignal.timeout;
  globalThis.window = desktopWindow(() => new Promise(() => {}));
  try {
    await withClient(async ({ fetchPeopleDailyBrief, fetchPeopleOutlookConnection, PEOPLE_REQUEST_TIMEOUT_MS }) => {
      AbortSignal.timeout = () => AbortSignal.abort(new DOMException("timed out", "TimeoutError"));
      try {
        const [daily, outlook] = await Promise.all([
          fetchPeopleDailyBrief("emp-1"),
          fetchPeopleOutlookConnection("emp-1"),
        ]);
        assert.equal(PEOPLE_REQUEST_TIMEOUT_MS, 20_000);
        assert.deepEqual(
          [daily.kind, daily.status, daily.reason],
          ["error", null, "request_timeout"],
        );
        assert.deepEqual(
          [outlook.kind, outlook.status, outlook.reason],
          ["error", null, "request_timeout"],
        );
      } finally {
        AbortSignal.timeout = originalTimeout;
      }
    });
  } finally {
    AbortSignal.timeout = originalTimeout;
    globalThis.window = originalWindow;
  }
});

test("People member reads preserve only allowlisted desktop timeout reasons", async () => {
  const originalWindow = globalThis.window;
  globalThis.window = desktopWindow(() => Promise.resolve({
    http_status: 0,
    body: { ok: false, reason: "runtime_request_timeout", diagnostic: "not-for-ui" },
  }));
  try {
    await withClient(async ({ fetchPeopleOutlookConnection }) => {
      const result = await fetchPeopleOutlookConnection("emp-1");
      assert.deepEqual(
        [result.kind, result.status, result.reason],
        ["error", 500, "runtime_request_timeout"],
      );
      assert.equal(JSON.stringify(result).includes("not-for-ui"), false);
    });
  } finally {
    globalThis.window = originalWindow;
  }
});
