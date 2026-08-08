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

const USER = "user-outm27-operational";
const ACTOR = "outlook-conversation-sync-service";

function credential({ accessToken, expiresAt }) {
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

async function runtime(context, now) {
  return createPostgresOutlookConversationRuntime({
    pool: context.fixture.appPool,
    domain_ledger: createPostgresDomainLedger({ pool: context.fixture.appPool }),
    tenant_id: TENANT,
    entra_tenant_id: ENTRA_TENANT,
    notification_url: NOTIFICATION_URL,
    cursor_key_material: "outm27-authority-loss-session-secret-material",
    credential_vault: context.credentialVault,
    conversation_provider: context.conversationProvider,
    request_runtime_authority: context.started.requestRuntimeAuthority,
    worker_schedule_enabled: true,
    clock: () => now.value,
  });
}

async function maintenance(instance, suffix) {
  return instance.maintenance_worker.runOnce({
    tenant_id: TENANT,
    worker_id: `outm27-authority-loss-${suffix}`,
    limit: 10,
  });
}

async function seedPair(context, now) {
  const instance = await runtime(context, now);
  const result = await maintenance(instance, "seed");
  assert.deepEqual(result.subscription_reconciliation, {
    attempted: 1, succeeded: 1, failed: 0,
  });
  assert.equal(context.remoteSubscriptions.length, 2);
  return instance;
}

async function mutateConnection(context, { expiresAt, scopes, revokedAt = null }) {
  await withPostgresTransaction(context.fixture.appPool, { tenant_id: TENANT }, (client) => client.query(
    `UPDATE lawos_domain.records SET payload=(payload - 'revoked_at')
       || jsonb_build_object('expires_at',$2::text,'granted_scopes',$3::jsonb)
       || CASE WHEN $4::text IS NULL THEN '{}'::jsonb
               ELSE jsonb_build_object('revoked_at',$4::text) END
      WHERE tenant_id=$1 AND domain_id='email-dms'
        AND record_type='M365Connection' AND record_id=$5`,
    [TENANT, expiresAt, JSON.stringify(scopes), revokedAt, CONNECTION],
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
        "SELECT status,pause_reason FROM lawos_email_dms.conversation_policies WHERE tenant_id=$1",
        [TENANT],
      )).rows[0],
      subscriptions: (await client.query(
        `SELECT status,provider_subscription_id,next_attempt_at
           FROM lawos_email_dms.graph_subscriptions WHERE tenant_id=$1 ORDER BY resource`,
        [TENANT],
      )).rows,
      pauseAudits: Number((await client.query(
        `SELECT count(*)::int AS count FROM lawos_email_dms.graph_sync_audit_events
          WHERE tenant_id=$1 AND event_type='conversation_policy.paused' AND actor_id=$2`,
        [TENANT, ACTOR],
      )).rows[0].count),
    }),
  );
}

test("OUTM-26 scheduled expiry cleanup refreshes only for exact deletes and never reactivates", async (t) => {
  const context = await createOperationalConversationFixture(t);
  if (!context) return;
  const now = { value: new Date("2026-08-09T00:10:00.000Z") };
  await seedPair(context, now);
  await mutateConnection(context, {
    expiresAt: "2026-08-09T00:00:00.000Z",
    scopes: ["Mail.Read"],
  });
  const policyStatusAtCredentialResolve = [];
  context.credentialVault.resolveDelegatedCredential = async () => {
    const state = await persistedState(context);
    policyStatusAtCredentialResolve.push(state.policy.status);
    return credential({
      accessToken: "expired-delete-token",
      expiresAt: "2026-08-09T00:00:00.000Z",
    });
  };
  const vaultStores = [];
  context.credentialVault.storeDelegatedCredential = async (input) => {
    vaultStores.push(input);
    throw new Error("delete-only refresh must not persist");
  };
  context.conversationProvider.refreshDelegatedCredential = async ({ credential: value }) => {
    context.providerCalls.push({ method: "refreshDelegatedCredential", input: value });
    return { token_bundle: credential({
      accessToken: "ephemeral-delete-token",
      expiresAt: "2026-08-09T01:10:00.000Z",
    }) };
  };
  let failOnce = true;
  context.conversationProvider.deleteOwnMessageSubscription = async (input) => {
    context.providerCalls.push({ method: "deleteOwnMessageSubscription", input });
    assert.equal(input.credential.access_token, "ephemeral-delete-token");
    if (failOnce) {
      failOnce = false;
      throw new Error("synthetic transient exact delete failure");
    }
    const index = context.remoteSubscriptions.findIndex(({ provider_subscription_id: id }) =>
      id === input.provider_subscription_id);
    if (index >= 0) context.remoteSubscriptions.splice(index, 1);
    return { deleted: true };
  };

  const first = await maintenance(await runtime(context, now), "expired-first");
  assert.deepEqual(first.subscription_reconciliation, {
    attempted: 1, succeeded: 0, failed: 1,
  });
  let state = await persistedState(context);
  assert.deepEqual(state.policy, { status: "paused", pause_reason: "connection_expired" });
  assert.equal(state.pauseAudits, 1);
  assert.equal(state.connection.expires_at, "2026-08-09T00:00:00.000Z");
  assert.equal(state.connection.state_version, 1);
  assert.equal(state.connection.credential_ref,
    "aws-secrets-manager:synthetic/outm27-operational");
  assert.equal(policyStatusAtCredentialResolve.every((status) => status === "paused"), true);
  assert.equal(vaultStores.length, 0);
  const retryAt = state.subscriptions.find(({ next_attempt_at: value }) => value)?.next_attempt_at;
  assert.ok(retryAt);

  now.value = new Date(Date.parse(retryAt) + 1);
  const second = await maintenance(await runtime(context, now), "expired-restart");
  assert.deepEqual(second.subscription_reconciliation, {
    attempted: 1, succeeded: 1, failed: 0,
  });
  state = await persistedState(context);
  assert.equal(state.subscriptions.every(({ status, provider_subscription_id: id }) =>
    status === "revoked" && id === null), true);
  assert.equal(context.remoteSubscriptions.length, 0);
  assert.equal(state.connection.expires_at, "2026-08-09T00:00:00.000Z");
  assert.equal(state.pauseAudits, 1);
  assert.equal(vaultStores.length, 0);

  const createCount = context.providerCalls.filter(({ method }) =>
    method === "createOwnMessageSubscription").length;
  const third = await maintenance(await runtime(context, now), "expired-converged");
  assert.equal(third.subscription_reconciliation.attempted, 0);
  assert.equal(context.providerCalls.filter(({ method }) =>
    method === "createOwnMessageSubscription").length, createCount);
});

for (const scenario of [
  { name: "scope loss", reason: "mail_read_scope_lost", scopes: ["Calendars.ReadWrite"] },
  { name: "revocation", reason: "connection_revoked", scopes: ["Mail.Read"], revokedAt: "2026-08-09T00:05:00.000Z" },
]) {
  test(`OUTM-26 scheduled ${scenario.name} cleanup pauses and cannot recreate after restart`, async (t) => {
    const context = await createOperationalConversationFixture(t);
    if (!context) return;
    const now = { value: new Date("2026-08-09T00:10:00.000Z") };
    await seedPair(context, now);
    await mutateConnection(context, {
      expiresAt: "2026-08-09T01:00:00.000Z",
      scopes: scenario.scopes,
      revokedAt: scenario.revokedAt,
    });
    context.credentialVault.resolveDelegatedCredential = async () => credential({
      accessToken: "current-delete-token",
      expiresAt: "2026-08-09T01:00:00.000Z",
    });
    context.conversationProvider.deleteOwnMessageSubscription = async (input) => {
      context.providerCalls.push({ method: "deleteOwnMessageSubscription", input });
      assert.equal(input.credential.access_token, "current-delete-token");
      const index = context.remoteSubscriptions.findIndex(({ provider_subscription_id: id }) =>
        id === input.provider_subscription_id);
      if (index >= 0) context.remoteSubscriptions.splice(index, 1);
      return { deleted: true };
    };

    const first = await maintenance(await runtime(context, now), `${scenario.name}-first`);
    assert.deepEqual(first.subscription_reconciliation, {
      attempted: 1, succeeded: 1, failed: 0,
    });
    const state = await persistedState(context);
    assert.deepEqual(state.policy, { status: "paused", pause_reason: scenario.reason });
    assert.equal(state.pauseAudits, 1);
    assert.equal(state.subscriptions.every(({ status }) => status === "revoked"), true);
    assert.equal(context.remoteSubscriptions.length, 0);
    assert.equal(context.providerCalls.some(({ method }) => method === "refreshDelegatedCredential"), false);

    const createCount = context.providerCalls.filter(({ method }) =>
      method === "createOwnMessageSubscription").length;
    const second = await maintenance(await runtime(context, now), `${scenario.name}-restart`);
    assert.equal(second.subscription_reconciliation.attempted, 0);
    assert.equal(context.providerCalls.filter(({ method }) =>
      method === "createOwnMessageSubscription").length, createCount);
  });
}
