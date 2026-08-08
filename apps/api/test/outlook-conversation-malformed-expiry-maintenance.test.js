import assert from "node:assert/strict";
import test from "node:test";

import { createPostgresDomainLedger } from "../../../packages/persistence/src/postgres/domain-ledger.js";
import { withPostgresTransaction } from "../../../packages/persistence/src/postgres/transaction.js";
import { createPostgresOutlookConversationRuntime } from "../src/outlook-conversation-operational-runtime.js";
import {
  CONNECTION,
  ENTRA_TENANT,
  MAILBOX,
  NOTIFICATION_URL,
  SUBJECT,
  TENANT,
} from "./support/outlook-conversation-operational-data.js";
import { createOperationalConversationFixture } from "./support/outlook-conversation-operational-fixture.js";

const ACTOR = "outlook-conversation-sync-service";

function runtime(context, now) {
  return createPostgresOutlookConversationRuntime({
    pool: context.fixture.appPool,
    domain_ledger: createPostgresDomainLedger({ pool: context.fixture.appPool }),
    tenant_id: TENANT,
    entra_tenant_id: ENTRA_TENANT,
    notification_url: NOTIFICATION_URL,
    cursor_key_material: "outm27-malformed-expiry-session-secret-material",
    credential_vault: context.credentialVault,
    conversation_provider: context.conversationProvider,
    request_runtime_authority: context.started.requestRuntimeAuthority,
    worker_schedule_enabled: true,
    clock: () => now.value,
  });
}

function maintenance(instance, suffix) {
  return instance.maintenance_worker.runOnce({
    tenant_id: TENANT,
    worker_id: `outm27-malformed-expiry-${suffix}`,
    limit: 10,
  });
}

async function mutateExpiry(context, kind, value) {
  await withPostgresTransaction(context.fixture.appPool, { tenant_id: TENANT }, (client) => client.query(
    `UPDATE lawos_domain.records
        SET payload=CASE $2
              WHEN 'missing' THEN payload - 'revoked_at' - 'expires_at'
              WHEN 'null' THEN (payload - 'revoked_at')
                || jsonb_build_object('expires_at',NULL)
              ELSE (payload - 'revoked_at')
                || jsonb_build_object('expires_at',$3::text)
            END
          || jsonb_build_object('granted_scopes','["Mail.Read"]'::jsonb)
      WHERE tenant_id=$1 AND domain_id='email-dms'
        AND record_type='M365Connection' AND record_id=$4`,
    [TENANT, kind, value, CONNECTION],
  ));
}

async function persistedState(context) {
  return withPostgresTransaction(
    context.fixture.appPool,
    { tenant_id: TENANT, readOnly: true },
    async (client) => ({
      connection: (await client.query(
        `SELECT payload FROM lawos_domain.records
          WHERE tenant_id=$1 AND domain_id='email-dms'
            AND record_type='M365Connection' AND record_id=$2`,
        [TENANT, CONNECTION],
      )).rows[0].payload,
      policy: (await client.query(
        `SELECT status,pause_reason FROM lawos_email_dms.conversation_policies
          WHERE tenant_id=$1`,
        [TENANT],
      )).rows[0],
      subscriptions: (await client.query(
        `SELECT status,provider_subscription_id,next_attempt_at
           FROM lawos_email_dms.graph_subscriptions
          WHERE tenant_id=$1 ORDER BY resource`,
        [TENANT],
      )).rows,
      pause_audits: Number((await client.query(
        `SELECT count(*)::int AS count
           FROM lawos_email_dms.graph_sync_audit_events
          WHERE tenant_id=$1 AND event_type='conversation_policy.paused'
            AND actor_id=$2`,
        [TENANT, ACTOR],
      )).rows[0].count),
    }),
  );
}

function cleanupCredential(accessToken, expiresAt) {
  return {
    access_token: accessToken,
    refresh_token: `${accessToken}-refresh`,
    refresh_profile: "client",
    refresh_profile_proof: "p".repeat(43),
    entra_subject_id: SUBJECT,
    mailbox_address: MAILBOX,
    consented_at: "2026-08-08T00:00:00.000Z",
    expires_at: expiresAt,
    granted_scopes: ["Mail.Read"],
  };
}

for (const scenario of [
  { name: "wrong shape", kind: "value", value: "not-an-instant" },
  { name: "impossible month", kind: "value", value: "2026-99-99T00:00:00.000Z" },
  { name: "impossible calendar day", kind: "value", value: "2026-02-29T00:00:00.000Z" },
  { name: "missing", kind: "missing", value: null },
  { name: "null", kind: "null", value: null },
]) {
  test(`OUTM-26 scheduled ${scenario.name} expiry pauses then cleans the exact pair across restart`, async (t) => {
    const context = await createOperationalConversationFixture(t);
    if (!context) return;
    const now = { value: new Date("2026-08-09T00:10:00.000Z") };
    assert.deepEqual((await maintenance(await runtime(context, now), "seed"))
      .subscription_reconciliation, { attempted: 1, succeeded: 1, failed: 0 });
    assert.equal(context.remoteSubscriptions.length, 2);
    await mutateExpiry(context, scenario.kind, scenario.value);
    const mutated = (await persistedState(context)).connection;

    const policyStatuses = [];
    const vaultStores = [];
    context.credentialVault.resolveDelegatedCredential = async () => {
      policyStatuses.push((await persistedState(context)).policy.status);
      return cleanupCredential("expired-cleanup-token", "2026-08-09T00:00:00.000Z");
    };
    context.credentialVault.storeDelegatedCredential = async (input) => {
      vaultStores.push(input);
      throw new Error("delete-only credential must never be persisted");
    };
    context.conversationProvider.refreshDelegatedCredential = async ({ credential }) => {
      context.providerCalls.push({ method: "refreshDelegatedCredential", input: credential });
      return { token_bundle: cleanupCredential(
        "ephemeral-cleanup-token",
        "2026-08-09T01:10:00.000Z",
      ) };
    };
    let failOnce = true;
    context.conversationProvider.deleteOwnMessageSubscription = async (input) => {
      context.providerCalls.push({ method: "deleteOwnMessageSubscription", input });
      assert.equal(input.credential.access_token, "ephemeral-cleanup-token");
      if (failOnce) {
        failOnce = false;
        throw new Error("synthetic transient exact delete failure");
      }
      const index = context.remoteSubscriptions.findIndex(({ provider_subscription_id: id }) =>
        id === input.provider_subscription_id);
      if (index >= 0) context.remoteSubscriptions.splice(index, 1);
      return { deleted: true };
    };

    const first = await maintenance(await runtime(context, now), "first");
    assert.deepEqual(first.subscription_reconciliation, {
      attempted: 1, succeeded: 0, failed: 1,
    });
    let state = await persistedState(context);
    assert.deepEqual(state.policy, {
      status: "paused", pause_reason: "connection_expired",
    });
    assert.equal(state.pause_audits, 1);
    assert.deepEqual(state.connection, mutated);
    assert.equal(policyStatuses.every((status) => status === "paused"), true);
    assert.equal(vaultStores.length, 0);
    assert.equal(context.remoteSubscriptions.length, 1);
    assert.deepEqual(state.subscriptions.map(({ status }) => status).sort(), [
      "cleanup_pending",
      "revoked",
    ]);
    assert.equal(context.providerCalls.filter(({ method }) =>
      method === "refreshDelegatedCredential").length, 1);

    const retryAt = state.subscriptions
      .map(({ next_attempt_at: value }) => Date.parse(value))
      .find(Number.isFinite);
    assert.ok(retryAt);
    now.value = new Date(retryAt + 1);
    const second = await maintenance(await runtime(context, now), "restart");
    assert.deepEqual(second.subscription_reconciliation, {
      attempted: 1, succeeded: 1, failed: 0,
    });
    state = await persistedState(context);
    assert.equal(state.subscriptions.every(({ status, provider_subscription_id: id }) =>
      status === "revoked" && id === null), true);
    assert.equal(context.remoteSubscriptions.length, 0);
    assert.deepEqual(state.connection, mutated);
    assert.equal(vaultStores.length, 0);
    assert.equal(context.providerCalls.filter(({ method }) =>
      method === "refreshDelegatedCredential").length, 2);

    const createCount = context.providerCalls.filter(({ method }) =>
      method === "createOwnMessageSubscription").length;
    const third = await maintenance(await runtime(context, now), "converged");
    assert.equal(third.subscription_reconciliation.attempted, 0);
    assert.equal(context.providerCalls.filter(({ method }) =>
      method === "createOwnMessageSubscription").length, createCount);
  });
}

test("OUTM-26 scheduled maintenance keeps a valid future leap-day connection active", async (t) => {
  const context = await createOperationalConversationFixture(t);
  if (!context) return;
  const now = { value: new Date("2026-08-09T00:10:00.000Z") };
  assert.equal((await maintenance(await runtime(context, now), "leap-seed"))
    .subscription_reconciliation.succeeded, 1);
  await mutateExpiry(context, "value", "2028-02-29T00:00:00.000Z");

  const result = await maintenance(await runtime(context, now), "valid-leap-day");
  assert.deepEqual(result.subscription_reconciliation, {
    attempted: 0, succeeded: 0, failed: 0,
  });
  assert.deepEqual((await persistedState(context)).policy, {
    status: "active", pause_reason: null,
  });
  assert.equal(context.remoteSubscriptions.length, 2);
});
