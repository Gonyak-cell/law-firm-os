import assert from "node:assert/strict";
import test from "node:test";

import { withPostgresTransaction } from "../../persistence/src/postgres/transaction.js";
import { createMigratedPostgresFixture } from "../../persistence/test/helpers/disposable-postgres.js";
import { createGraphCursorCodec } from "../src/graph-cursor-codec.js";
import { createPostgresConversationSyncStore } from "../src/postgres-conversation-sync-store.js";
import { graphSubscriptionCreateFailureState } from "../src/postgres-graph-subscription-create-recovery.js";
import { createPostgresGraphSubscriptionService } from "../src/postgres-graph-subscription-service.js";
import {
  ENTRA_TENANT,
  graphSubscriptionInput,
  NOTIFICATION_URL,
  seedGraphSubscriptionFixture,
  SUBJECT,
  TENANT,
} from "./support/postgres-graph-subscription-fixture.js";

const RESOURCES = [
  "me/mailFolders('inbox')/messages",
  "me/mailFolders('sentitems')/messages",
];

test("OUTM-26 create failure classification clears only definite pre-remote rejections", () => {
  assert.equal(graphSubscriptionCreateFailureState({
    safe_error_code: "MICROSOFT_EGRESS_UPSTREAM_REJECTED",
  }), "not_created");
  assert.equal(graphSubscriptionCreateFailureState(new TypeError("transport decoder failed")),
    "unknown");
});

test("OUTM-26 definitive create rejection clears the fence and retries Inbox and Sent after restart", async (t) => {
  const fixture = await createMigratedPostgresFixture(t, { appPoolMax: 6 });
  if (!fixture) return;
  await seedGraphSubscriptionFixture(fixture);
  const store = createPostgresConversationSyncStore({
    pool: fixture.appPool,
    tenant_id: TENANT,
    cursor_codec: createGraphCursorCodec({ key: Buffer.alloc(32, 3) }),
  });
  let now = new Date("2026-08-08T00:00:00.000Z");
  const rejected = new Set();
  const createCalls = [];
  const remote = [];
  const provider = {
    async listOwnMessageSubscriptions() { return structuredClone(remote); },
    async createOwnMessageSubscription(input) {
      createCalls.push([input.resource, input.provisioning_correlation_id]);
      if (!rejected.has(input.resource)) {
        rejected.add(input.resource);
        throw Object.assign(new Error("definite pre-remote rejection"), {
          remote_commit_state: "not_created",
          safe_error_code: "MICROSOFT_EGRESS_UPSTREAM_REJECTED",
          status: 400,
        });
      }
      const created = {
        provider_subscription_id: `provider-definitive-${remote.length + 1}`,
        resource: input.resource,
        change_type: "created",
        client_state_hash: input.client_state_hash,
        notification_url: NOTIFICATION_URL,
        entra_tenant_id: ENTRA_TENANT,
        account_id: SUBJECT,
        expires_at: input.expiration_datetime,
      };
      remote.push(created);
      return structuredClone(created);
    },
    async renewOwnMessageSubscription() { throw new Error("renew not expected"); },
    async deleteOwnMessageSubscription() { throw new Error("delete not expected"); },
  };
  const service = () => createPostgresGraphSubscriptionService({
    pool: fixture.appPool,
    tenant_id: TENANT,
    state_lookup: store.readConnectionState,
    provider,
    entra_tenant_id: ENTRA_TENANT,
    notification_url: NOTIFICATION_URL,
    clock: () => now,
  });
  const advancePastRetry = async () => {
    const value = await withPostgresTransaction(
      fixture.appPool,
      { tenant_id: TENANT, readOnly: true },
      async (client) => (await client.query(
        "SELECT max(next_attempt_at) AS retry_at FROM lawos_email_dms.graph_subscriptions",
      )).rows[0].retry_at,
    );
    now = new Date(Date.parse(value) + 1);
  };

  await assert.rejects(service().reconcile(graphSubscriptionInput()), /definite/u);
  await advancePastRetry();
  await assert.rejects(service().reconcile(graphSubscriptionInput()), /definite/u);
  await advancePastRetry();
  const result = await service().reconcile(graphSubscriptionInput());

  assert.equal(result.outcome, "active");
  assert.deepEqual(remote.map(({ resource }) => resource).sort(), [...RESOURCES].sort());
  for (const resource of RESOURCES) {
    const calls = createCalls.filter(([candidate]) => candidate === resource);
    assert.equal(calls.length, 2);
    assert.notEqual(calls[0][1], calls[1][1]);
  }
  const rows = await withPostgresTransaction(
    fixture.appPool,
    { tenant_id: TENANT, readOnly: true },
    async (client) => (await client.query(
      `SELECT resource,status,provider_subscription_id
         FROM lawos_email_dms.graph_subscriptions ORDER BY resource`,
    )).rows,
  );
  assert.equal(rows.every(({ status, provider_subscription_id: id }) =>
    status === "active" && Boolean(id)), true);
});
