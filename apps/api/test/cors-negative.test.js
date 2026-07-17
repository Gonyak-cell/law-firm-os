import assert from "node:assert/strict";
import test from "node:test";
import {
  configuredCorsAllowedOrigins,
  corsHeadersForRequest,
  startApiServer,
} from "../src/server.js";

const CUSTOM_ORIGIN = "matter-app://app";
const DEV_ORIGIN = "http://127.0.0.1:5173";

test("default CORS allowlist contains only named custom and development origins", () => {
  const origins = configuredCorsAllowedOrigins({ env: {} });
  assert.equal(origins.includes(CUSTOM_ORIGIN), true);
  assert.equal(origins.includes(DEV_ORIGIN), true);
  assert.equal(origins.includes("http://127.0.0.1:5186"), true);
  assert.equal(origins.includes("null"), false);
  assert.equal(origins.includes("*"), false);

  const nullHeaders = corsHeadersForRequest({ headers: { origin: "null" } }, { env: {} });
  assert.equal(nullHeaders["access-control-allow-origin"], undefined);
  assert.equal(nullHeaders.vary, "origin");

  const configured = configuredCorsAllowedOrigins({
    env: { LAWOS_API_ALLOWED_ORIGINS: "null,*,https://approved.example" },
  });
  assert.equal(configured.includes("null"), false);
  assert.equal(configured.includes("*"), false);
  assert.equal(configured.includes("https://approved.example"), true);
});

test("API reflects exact custom and dev origins but never null or arbitrary origins", async () => {
  const started = await startApiServer({ port: 0 });
  const baseUrl = `http://${started.host}:${started.port}`;
  try {
    for (const origin of [CUSTOM_ORIGIN, DEV_ORIGIN]) {
      const response = await fetch(`${baseUrl}/api/health`, {
        method: "OPTIONS",
        headers: {
          origin,
          "access-control-request-method": "GET",
        },
      });
      assert.equal(response.status, 204);
      assert.equal(response.headers.get("access-control-allow-origin"), origin);
      assert.equal(response.headers.get("vary"), "origin");
    }
    for (const origin of ["null", "https://example.invalid"]) {
      const response = await fetch(`${baseUrl}/api/health`, { headers: { origin } });
      assert.equal(response.status, 200);
      assert.equal(response.headers.get("access-control-allow-origin"), null);
      assert.equal(response.headers.get("vary"), "origin");
    }
  } finally {
    await new Promise((resolveClose) => started.server.close(resolveClose));
  }
});
