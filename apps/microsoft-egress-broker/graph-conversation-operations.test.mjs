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

test("OUTM-26 broker requires the exact public HTTPS notification path", () => {
  for (const graph_notification_url of [
    "http://app.example.invalid/api/outlook/graph/notifications",
    "https://app.example.invalid/api/outlook/graph/notifications?forward=1",
    "https://app.example.invalid/other",
  ]) {
    assert.throws(
      () => createHandler({ graph_notification_url, fetch_impl: async () => json({}) }),
      /exact HTTPS Graph webhook URL/u,
    );
  }
});

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
        lifecycleNotificationUrl: CALLBACK,
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
  assert.equal(body.lifecycleNotificationUrl, CALLBACK);
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
        lifecycleNotificationUrl: CALLBACK,
      }] });
      if (options.method === "PATCH") return json({
        id: "provider-subscription-outm26",
        resource: RESOURCE,
        changeType: "created",
        clientState: "opaque-client-state-outm26",
        expirationDateTime: "2026-08-08T02:00:00.000Z",
        notificationUrl: CALLBACK,
        lifecycleNotificationUrl: CALLBACK,
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

test("OUTM-26 broker treats an already missing subscription delete as idempotent success", async () => {
  const handler = createHandler({
    graph_notification_url: CALLBACK,
    fetch_impl: async () => json({ error: { message: "not exposed" } }, 404),
  });
  const result = await handler(envelope("graph.messageSubscription.delete", {
    access_token: "token",
    provider_subscription_id: "already-missing-outm26",
  }));
  assert.equal(result.ok, true);
  assert.deepEqual(result.result, { deleted: true, provider_subscription_id: "already-missing-outm26", already_missing: true });
});

test("OUTM-27 broker follows only fixed me-message delta links and emits sanitized identities", async () => {
  // Given
  const calls = [];
  const handler = createHandler({
    graph_notification_url: CALLBACK,
    fetch_impl: async (url, options) => {
      calls.push({ url, options });
      return json({
        value: [{ id: "message-delta-outm27", conversationId: "must-not-cross", subject: "must-not-cross" }],
        "@odata.deltaLink": "https://graph.microsoft.com/v1.0/me/mailFolders('inbox')/messages/delta?$deltatoken=next",
      });
    },
  });

  // When
  const first = await handler(envelope("graph.messageDelta.list", {
    access_token: "token",
    resource: RESOURCE,
    delta_link: null,
    start_at: "2026-08-08T00:00:00.000Z",
  }));
  const blocked = await handler(envelope("graph.messageDelta.list", {
    access_token: "token",
    resource: RESOURCE,
    delta_link: "https://evil.example.invalid/v1.0/me/mailFolders('inbox')/messages/delta?$deltatoken=stolen",
    start_at: null,
  }));
  const poisoned = await handler(envelope("graph.messageDelta.list", {
    access_token: "token",
    resource: RESOURCE,
    delta_link: "https://graph.microsoft.com/v1.0/me/mailFolders('inbox')/messages/delta?%24filter=receivedDateTime%20ge%202026-08-08T00%3A00%3A00.000Z%20or%20isDraft%20eq%20true&%24deltatoken=stolen",
    start_at: null,
  }));

  // Then
  assert.equal(first.ok, true);
  assert.deepEqual(first.result.messages, [{ message_id: "message-delta-outm27", removed: false }]);
  assert.equal(JSON.stringify(first).includes("must-not-cross"), false);
  assert.equal(blocked.error.code, "TARGET_POLICY_VIOLATION");
  assert.equal(poisoned.error.code, "TARGET_POLICY_VIOLATION");
  assert.equal(calls.length, 1);
  assert.equal(new URL(calls[0].url).pathname, "/v1.0/me/mailFolders('inbox')/messages/delta");
  assert.equal(new URL(calls[0].url).searchParams.get("$select"), "id");
  assert.equal(new URL(calls[0].url).searchParams.get("changeType"), "created");
  assert.equal(new URL(calls[0].url).searchParams.get("$filter"), "receivedDateTime ge 2026-08-08T00:00:00.000Z");
});

test("OUTM-27 broker identifies an expired delta cursor without leaking the provider response", async () => {
  const handler = createHandler({
    graph_notification_url: CALLBACK,
    fetch_impl: async () => json({ error: { message: "sensitive provider detail" } }, 410),
  });
  const result = await handler(envelope("graph.messageDelta.list", {
    access_token: "token",
    resource: RESOURCE,
    delta_link: "https://graph.microsoft.com/v1.0/me/mailFolders('inbox')/messages/delta?$deltatoken=expired",
    start_at: null,
  }));
  assert.equal(result.ok, false);
  assert.equal(result.status, 409);
  assert.equal(result.error.code, "DELTA_CURSOR_EXPIRED");
  assert.equal(JSON.stringify(result).includes("sensitive provider detail"), false);
});
