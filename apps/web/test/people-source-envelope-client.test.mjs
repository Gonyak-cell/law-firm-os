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

test("People client accepts only the versioned source envelope and strips status extras", async () => {
  await withClient(({ parsePeopleSourceEnvelope }) => {
    const result = parsePeopleSourceEnvelope({
      schema_version: "lawos.people-source-envelope.v1",
      state: "partial",
      as_of: "2026-07-30T09:30:00.000Z",
      timezone: "Asia/Seoul",
      source_status: [{
        source: "matter",
        state: "ok",
        last_success_at: "2026-07-30T09:30:00.000Z",
        stale_after: "2026-07-30T10:00:00.000Z",
        safe_error_code: null,
        access_token: "not-forwarded",
      }],
      data: { matter: { assigned_matter_count: 2 } },
    });

    assert.equal(result.kind, "data");
    assert.equal(JSON.stringify(result).includes("access_token"), false);
    assert.equal(parsePeopleSourceEnvelope({ state: "ok" }).kind, "error");
    assert.equal(parsePeopleSourceEnvelope({
      schema_version: "lawos.people-source-envelope.v0",
      state: "ok",
      as_of: "2026-07-30T09:30:00.000Z",
      timezone: "Asia/Seoul",
      source_status: [],
      data: {},
    }).kind, "error");
  });
});
