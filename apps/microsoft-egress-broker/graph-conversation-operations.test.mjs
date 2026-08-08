import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import test from "node:test";

import { CONTRACT_VERSION, createHandler } from "./index.mjs";

const CALLBACK = "https://app.example.invalid/api/outlook/graph/notifications";
const RESOURCE = "me/mailFolders('inbox')/messages";

function envelope(operation, request) {
  return { contract_version: CONTRACT_VERSION, operation, request };
}

function json(body, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json" } });
}

test("OUTM-26 broker creates a basic me-only subscription without rich resource data", async () => {
  // Given
  const calls = [];
  const handler = createHandler({
    graph_notification_url: CALLBACK,
    fetch_impl: async (url, options) => {
      calls.push({ url, options });
      return json({
        id: "provider-subscription-outm26",
        resource: RESOURCE,
        changeType: "created",
        clientState: "opaque-client-state-outm26",
        expirationDateTime: "2026-08-08T01:00:00.000Z",
        notificationUrl: CALLBACK,
      }, 201);
    },
  });

  // When
  const result = await handler(envelope("graph.messageSubscription.create", {
    access_token: "synthetic-token-outm26",
    resource: RESOURCE,
    change_type: "created",
    client_state: "opaque-client-state-outm26",
    expiration_datetime: "2026-08-08T01:00:00.000Z",
  }));

  // Then
  assert.equal(result.ok, true);
  assert.equal(new URL(calls[0].url).pathname, "/v1.0/subscriptions");
  const body = JSON.parse(calls[0].options.body);
  assert.equal(body.notificationUrl, CALLBACK);
  assert.equal(body.resource, RESOURCE);
  assert.equal(Object.hasOwn(body, "includeResourceData"), false);
  assert.equal(result.result.client_state_hash, createHash("sha256").update("opaque-client-state-outm26").digest("hex"));
  assert.equal(JSON.stringify(result).includes("opaque-client-state-outm26"), false);
});

test("OUTM-26 broker lists, renews, and deletes only fixed Graph subscription targets", async () => {
  // Given
  const calls = [];
  const handler = createHandler({
    graph_notification_url: CALLBACK,
    fetch_impl: async (url, options) => {
      calls.push({ url, options });
      if (options.method === "GET") return json({ value: [{
        id: "provider-subscription-outm26",
        resource: RESOURCE,
        changeType: "created",
        clientState: "opaque-client-state-outm26",
        expirationDateTime: "2026-08-08T01:00:00.000Z",
        notificationUrl: CALLBACK,
      }] });
      if (options.method === "PATCH") return json({
        id: "provider-subscription-outm26",
        resource: RESOURCE,
        changeType: "created",
        clientState: "opaque-client-state-outm26",
        expirationDateTime: "2026-08-08T02:00:00.000Z",
        notificationUrl: CALLBACK,
      });
      return new Response(null, { status: 204 });
    },
  });

  // When
  const listed = await handler(envelope("graph.messageSubscription.list", { access_token: "token" }));
  const renewed = await handler(envelope("graph.messageSubscription.renew", {
    access_token: "token",
    provider_subscription_id: "provider-subscription-outm26",
    expiration_datetime: "2026-08-08T02:00:00.000Z",
  }));
  const deleted = await handler(envelope("graph.messageSubscription.delete", {
    access_token: "token",
    provider_subscription_id: "provider-subscription-outm26",
  }));

  // Then
  assert.equal(listed.ok && renewed.ok && deleted.ok, true);
  assert.equal(JSON.stringify(listed).includes("opaque-client-state-outm26"), false);
  assert.deepEqual(calls.map(({ options }) => options.method), ["GET", "PATCH", "DELETE"]);
  assert.ok(calls.every(({ url }) => new URL(url).origin === "https://graph.microsoft.com"));
});

test("OUTM-26 broker rejects shared or arbitrary resources before egress", async () => {
  // Given
  let calls = 0;
  const handler = createHandler({
    graph_notification_url: CALLBACK,
    fetch_impl: async () => { calls += 1; return json({}); },
  });

  // When
  const result = await handler(envelope("graph.messageSubscription.create", {
    access_token: "token",
    resource: "users/other@example.invalid/messages",
    change_type: "created",
    client_state: "opaque-client-state-outm26",
    expiration_datetime: "2026-08-08T01:00:00.000Z",
  }));

  // Then
  assert.equal(result.ok, false);
  assert.equal(result.error.code, "INVALID_REQUEST");
  assert.equal(calls, 0);
});
