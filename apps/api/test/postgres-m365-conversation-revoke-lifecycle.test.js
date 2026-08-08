import assert from "node:assert/strict";
import test from "node:test";

import { createPostgresM365RevokeLifecycleFixture } from "./support/postgres-m365-revoke-lifecycle-fixture.js";

test("OUTM-26 real revoke retries exact subscription deletes before provider revoke and vault cleanup", async (t) => {
  const value = await createPostgresM365RevokeLifecycleFixture(t, {
    failSentOnce: true,
  });
  if (!value) return;

  await assert.rejects(value.revoke(), /transient subscription delete/u);
  let state = await value.state();
  assert.equal(state.connection.revoked_at, null);
  assert.equal(value.events.some(([event]) => event === "provider_revoke"), false);
  assert.equal(value.events.some(([event]) => event === "vault_delete"), false);
  assert.deepEqual([...value.remote], ["provider-revoke-1"]);
  assert.deepEqual(state.subscriptions.map(({ status }) => status), [
    "revoked",
    "cleanup_pending",
  ]);

  await value.advancePastRetry();
  const result = await value.revoke();
  assert.equal(result.outcome, "disconnected");
  state = await value.state();
  assert.ok(state.connection.revoked_at);
  assert.equal(state.subscriptions.every(({ status, provider_subscription_id: id }) =>
    status === "revoked" && id === null), true);
  assert.equal(value.remote.size, 0);
  const finalDelete = value.events.findLastIndex(([event]) => event === "subscription_delete");
  const providerRevoke = value.events.findIndex(([event]) => event === "provider_revoke");
  const vaultDelete = value.events.findIndex(([event]) => event === "vault_delete");
  assert.ok(finalDelete < providerRevoke && providerRevoke < vaultDelete);
});

test("OUTM-26 expired access token is refreshed before exact subscription cleanup and revoke", async (t) => {
  const value = await createPostgresM365RevokeLifecycleFixture(t, {
    expired: true,
  });
  if (!value) return;

  const result = await value.revoke();
  assert.equal(result.outcome, "disconnected");
  const graphEvents = value.events.filter(([event]) => [
    "refresh",
    "subscription_delete",
    "provider_revoke",
  ].includes(event));
  assert.deepEqual(graphEvents.map(([event]) => event), [
    "refresh",
    "subscription_delete",
    "subscription_delete",
    "provider_revoke",
  ]);
  assert.equal(graphEvents
    .filter(([event]) => event === "subscription_delete")
    .every(([, , accessToken]) => accessToken === "refreshed-access"), true);
  assert.deepEqual(graphEvents.at(-1), ["provider_revoke", "refreshed-access"]);
  assert.equal(value.remote.size, 0);
  assert.equal((await value.state()).subscriptions.every(({ status }) =>
    status === "revoked"), true);
});

test("OUTM-26 scheduled expiry cleanup refreshes a rejected token before exact deletes", async (t) => {
  const value = await createPostgresM365RevokeLifecycleFixture(t, {
    expired: true,
  });
  if (!value) return;

  const result = await value.cleanupExpired();
  assert.equal(result.outcome, "expired_connection");
  assert.equal(value.remote.size, 0);
  assert.deepEqual(value.events
    .filter(([event]) => ["refresh", "subscription_delete"].includes(event))
    .map(([event, providerId, accessToken]) => [event, providerId, accessToken]), [
    ["refresh", "expired-access", undefined],
    ["subscription_delete", "provider-revoke-0", "refreshed-access"],
    ["refresh", "expired-access", undefined],
    ["subscription_delete", "provider-revoke-1", "refreshed-access"],
  ]);
  const state = await value.state();
  assert.equal(state.subscriptions.every(({ status }) => status === "revoked"), true);
  assert.equal(state.connection.expires_at, "2026-08-08T00:05:00.000Z");
  assert.equal(state.connection.state_version, 1);
  assert.equal(value.events.some(([event]) => event === "vault_store"), false);
});
