import assert from "node:assert/strict";
import test from "node:test";

import { createApiServer } from "../src/server.js";
import { OUTLOOK_GRAPH_WEBHOOK_PATH } from "../src/outlook-graph-webhook.js";

test("OUTM-27 central server exposes only the isolated public Graph webhook route", async (t) => {
  // Given
  const calls = [];
  const server = createApiServer({
    hrxRuntime: {},
    masterDataRuntime: {},
    matterRuntime: {},
    dmsRuntime: {},
    emailDmsRuntime: {},
    crmIntakeRuntime: {},
    financeRuntime: {},
    analyticsRuntime: {},
    aiRuntime: {},
    portalRuntime: {},
    uiReadinessRuntime: {},
    homeDashboardRuntime: {},
    enterpriseReadinessRuntime: {},
    stepUpAuthority: {},
    sessionAuth: {},
    outlookGraphWebhook: {
      handle(input) {
        calls.push(input);
        return { status: 200, headers: { "content-type": "text/plain; charset=utf-8", "cache-control": "no-store" }, body: input.query.validationToken };
      },
    },
  });
  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
  t.after(() => new Promise((resolve) => {
    server.close(resolve);
    server.closeAllConnections();
  }));

  // When
  const response = await fetch(`http://127.0.0.1:${server.address().port}${OUTLOOK_GRAPH_WEBHOOK_PATH}?validationToken=server-token-outm27`, { method: "POST", headers: { "connection": "close", "content-type": "text/plain" } });

  // Then
  assert.equal(response.status, 200);
  assert.equal(response.headers.get("content-type"), "text/plain; charset=utf-8");
  assert.equal(await response.text(), "server-token-outm27");
  assert.equal(calls.length, 1);
  assert.equal(calls[0].method, "POST");

  const malformed = await fetch(`http://127.0.0.1:${server.address().port}${OUTLOOK_GRAPH_WEBHOOK_PATH}`, { method: "POST", headers: { "connection": "close", "content-type": "application/json" }, body: "{" });
  assert.equal(malformed.status, 400);
  assert.deepEqual((await malformed.json()).safe_error_codes, ["OUTLOOK_GRAPH_NOTIFICATION_INVALID"]);
  assert.equal(calls.length, 1);
});
