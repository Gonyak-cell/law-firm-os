import assert from "node:assert/strict";
import test from "node:test";

import { CONTRACT_VERSION, createHandler } from "./index.mjs";

const CALLBACK = "https://app.example.invalid/api/outlook/graph/notifications";
const RESOURCE = "me/mailFolders('inbox')/messages";

function envelope(request) {
  return {
    contract_version: CONTRACT_VERSION,
    operation: "graph.messageSubscription.list",
    request,
  };
}

function json(body) {
  return new Response(JSON.stringify(body), {
    status: 200,
    headers: { "content-type": "application/json" },
  });
}

test("OUTM-26 broker exhausts a bounded exact-host subscription continuation before adoption", async () => {
  const calls = [];
  const handler = createHandler({
    graph_notification_url: CALLBACK,
    fetch_impl: async (url) => {
      calls.push(url);
      if (calls.length === 1) {
        return json({
          value: [],
          "@odata.nextLink": "https://graph.microsoft.com/v1.0/subscriptions?$skiptoken=page-2",
        });
      }
      return json({ value: [{
        id: "provider-subscription-page-2",
        resource: RESOURCE,
        changeType: "created",
        clientState: "opaque-client-state-page-2",
        expirationDateTime: "2026-08-08T01:00:00.000Z",
        notificationUrl: CALLBACK,
        lifecycleNotificationUrl: CALLBACK,
      }] });
    },
  });
  const result = await handler(envelope({
    access_token: "token",
    entra_tenant_id: "entra-tenant-page-2",
    account_id: "account-page-2",
  }));
  assert.equal(result.ok, true);
  assert.equal(calls.length, 2);
  assert.equal(new URL(calls[1]).searchParams.get("$skiptoken"), "page-2");
  assert.deepEqual(result.result.map(({ provider_subscription_id: id }) => id), [
    "provider-subscription-page-2",
  ]);
  assert.equal(result.result[0].account_id, "account-page-2");
});

test("OUTM-26 broker rejects cross-host, cyclic, and over-budget subscription pages", async () => {
  for (const scenario of ["cross-host", "cycle", "over-budget"]) {
    let calls = 0;
    const handler = createHandler({
      graph_notification_url: CALLBACK,
      fetch_impl: async (url) => {
        calls += 1;
        if (scenario === "cross-host") {
          return json({ value: [], "@odata.nextLink": "https://evil.example.invalid/v1.0/subscriptions?$skiptoken=stolen" });
        }
        if (scenario === "cycle") {
          return json({ value: [], "@odata.nextLink": url });
        }
        return json({
          value: [],
          "@odata.nextLink": `https://graph.microsoft.com/v1.0/subscriptions?$skiptoken=page-${calls + 1}`,
        });
      },
    });
    const result = await handler(envelope({
      access_token: "token",
      entra_tenant_id: "entra-tenant-page-budget",
      account_id: "account-page-budget",
    }));
    assert.equal(result.ok, false, scenario);
    assert.ok(calls <= 10, scenario);
    assert.ok([
      "TARGET_POLICY_VIOLATION",
      "UPSTREAM_RESPONSE_INVALID",
      "SUBSCRIPTION_PAGE_BUDGET_EXHAUSTED",
    ].includes(result.error.code), scenario);
  }
});
