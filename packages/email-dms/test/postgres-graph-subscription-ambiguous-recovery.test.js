import assert from "node:assert/strict";
import test from "node:test";

import { withPostgresTransaction } from "../../persistence/src/postgres/transaction.js";
import { createMigratedPostgresFixture } from "../../persistence/test/helpers/disposable-postgres.js";
import { createGraphCursorCodec } from "../src/graph-cursor-codec.js";
import { createPostgresConversationSyncStore } from "../src/postgres-conversation-sync-store.js";
import { createPostgresGraphSubscriptionService } from "../src/postgres-graph-subscription-service.js";
import {
  ENTRA_TENANT,
  graphSubscriptionInput,
  NOTIFICATION_URL,
  seedGraphSubscriptionFixture,
  SUBJECT,
  TENANT,
} from "./support/postgres-graph-subscription-fixture.js";

const INBOX = "me/mailFolders('inbox')/messages";
const SENT = "me/mailFolders('sentitems')/messages";
const ADOPTION_WINDOW_MS = 10_000;

test("OUTM-26 ambiguous creates retain incomplete fences, adopt page-two Inbox, and safely retry empty Sent", async (t) => {
  const fixture = await createMigratedPostgresFixture(t, { appPoolMax: 6 });
  if (!fixture) return;
  await seedGraphSubscriptionFixture(fixture);
  const store = createPostgresConversationSyncStore({
    pool: fixture.appPool,
    tenant_id: TENANT,
    cursor_codec: createGraphCursorCodec({ key: Buffer.alloc(32, 5) }),
  });
  let now = new Date("2026-08-08T00:00:00.000Z");
  let listMode = "complete";
  const createCalls = [];
  const remote = [{
    provider_subscription_id: "provider-unknown-ambiguous",
    resource: INBOX,
    change_type: "created",
    client_state_hash: "f".repeat(64),
    notification_url: NOTIFICATION_URL,
    entra_tenant_id: ENTRA_TENANT,
    account_id: SUBJECT,
    expires_at: "2026-08-08T02:00:00.000Z",
  }];
  const ambiguous = () => Object.assign(new Error("ambiguous transport timeout"), {
    remote_commit_state: "unknown",
    safe_error_code: "MICROSOFT_EGRESS_UNAVAILABLE",
    status: 503,
  });
  const provider = {
    async listOwnMessageSubscriptions() {
      if (listMode === "incomplete") {
        throw Object.assign(new Error("incomplete remote enumeration"), {
          safe_error_code: "SUBSCRIPTION_PAGE_BUDGET_EXHAUSTED",
        });
      }
      return structuredClone(remote);
    },
    async createOwnMessageSubscription(input) {
      createCalls.push(input.resource);
      const created = {
        provider_subscription_id: `provider-ambiguous-${input.resource === INBOX ? "inbox" : "sent"}`,
        resource: input.resource,
        change_type: "created",
        client_state_hash: input.client_state_hash,
        notification_url: NOTIFICATION_URL,
        entra_tenant_id: ENTRA_TENANT,
        account_id: SUBJECT,
        expires_at: input.expiration_datetime,
      };
      if (input.resource === INBOX && createCalls.filter((item) => item === INBOX).length === 1) {
        remote.push(created);
        throw ambiguous();
      }
      if (input.resource === SENT && createCalls.filter((item) => item === SENT).length === 1) {
        throw ambiguous();
      }
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
    adoption_window_ms: ADOPTION_WINDOW_MS,
    clock: () => now,
  });

  await assert.rejects(service().reconcile(graphSubscriptionInput()), /ambiguous/u);
  listMode = "incomplete";
  now = new Date("2026-08-08T00:00:03.000Z");
  await assert.rejects(service().reconcile(graphSubscriptionInput()), /incomplete/u);
  assert.deepEqual(createCalls, [INBOX]);

  listMode = "complete";
  await assert.rejects(service().reconcile(graphSubscriptionInput()), /ambiguous/u);
  assert.deepEqual(createCalls, [INBOX, SENT]);
  now = new Date("2026-08-08T00:00:09.000Z");
  assert.equal((await service().reconcile(graphSubscriptionInput())).outcome, "retry_scheduled");
  assert.deepEqual(createCalls, [INBOX, SENT]);

  now = new Date("2026-08-08T00:00:14.000Z");
  assert.equal((await service().reconcile(graphSubscriptionInput())).outcome, "retry_scheduled");
  assert.deepEqual(createCalls, [INBOX, SENT]);
  const released = await withPostgresTransaction(
    fixture.appPool,
    { tenant_id: TENANT, readOnly: true },
    async (client) => (await client.query(
      `SELECT provisioning_correlation_id,next_attempt_at
         FROM lawos_email_dms.graph_subscriptions WHERE resource=$1`,
      [SENT],
    )).rows[0],
  );
  assert.equal(released.provisioning_correlation_id, null);
  now = new Date(Date.parse(released.next_attempt_at) + 1);
  const result = await service().reconcile(graphSubscriptionInput());

  assert.equal(result.outcome, "active");
  assert.deepEqual(createCalls, [INBOX, SENT, SENT]);
  assert.equal(remote.filter(({ provider_subscription_id: id }) =>
    id === "provider-ambiguous-inbox").length, 1);
  assert.equal(remote.filter(({ provider_subscription_id: id }) =>
    id === "provider-ambiguous-sent").length, 1);
  assert.equal(remote.some(({ provider_subscription_id: id }) =>
    id === "provider-unknown-ambiguous"), true);
});
