import assert from "node:assert/strict";
import test from "node:test";

import { withPostgresTransaction } from "../../../packages/persistence/src/postgres/transaction.js";
import {
  handleOutlookConversationMaintenanceEvent,
  LAWOS_OUTLOOK_CONVERSATION_WORKER_ACTION,
} from "../src/outlook-conversation-maintenance-invocation.js";
import {
  CLIENT_STATE,
  ENTRA_TENANT,
  EXPIRES_AT,
  MAILBOX,
  NOTIFICATION_URL,
  PROVIDER_SUBSCRIPTION,
  SUBJECT,
  TENANT,
} from "./support/outlook-conversation-operational-data.js";
import { createOperationalConversationFixture } from "./support/outlook-conversation-operational-fixture.js";

test("OUTM-27 operational server composes PostgreSQL webhook, recovery, and Inbox filing", async (t) => {
  const context = await createOperationalConversationFixture(t);
  if (!context) return;
  const { base, fixture, providerCalls, started } = context;
  assert.equal(started.outlookConversationRuntime.authority, "postgres-outlook-conversation-sync");
  assert.equal(started.outlookConversationRuntime.queue.lease_duration_ms, 15 * 60_000);
  assert.equal(typeof started.outlookConversationRuntime.before_connection_revoke, "function");
  const health = await fetch(`${base}/api/health`).then((response) => response.json());
  assert.deepEqual(health.outlook_graph_sync, {
    status: "ready",
    persistence: "postgres-v2",
    migration_id: "303_client_outlook_conversation_sync",
    migration_checksum: health.outlook_graph_sync.migration_checksum,
    webhook_route_ready: true,
    durable_queue_ready: true,
    encrypted_cursor_ready: true,
    conversation_provider_ready: true,
    missed_notification_recovery_ready: true,
    policy_runtime_ready: true,
    subscription_reconciler_ready: true,
    message_auto_filing_ready: true,
    maintenance_worker_ready: true,
    worker_schedule_ready: true,
    auto_filing_enabled: true,
  });
  assert.match(health.outlook_graph_sync.migration_checksum, /^[a-f0-9]{64}$/u);
  await started.outlookConversationRuntime.conversation_port.listOwnMessageSubscriptions({
    tenant_id: TENANT,
    user_id: "user-outm27-operational",
    entra_subject_id: SUBJECT,
    entra_tenant_id: ENTRA_TENANT,
    mailbox_scope: "me",
  });
  assert.equal(providerCalls[0].method, "listOwnMessageSubscriptions");
  assert.equal(providerCalls[0].input.credential.access_token, "outm27-operational-access-token");

  const response = await fetch(`${base}/api/outlook/graph/notifications`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ value: [{
      subscriptionId: PROVIDER_SUBSCRIPTION,
      tenantId: ENTRA_TENANT,
      clientState: CLIENT_STATE,
      subscriptionExpirationDateTime: EXPIRES_AT,
      changeType: "created",
      resource: `Users/${SUBJECT}/Messages/message-outm27-operational`,
      resourceData: { id: "message-outm27-operational", "@odata.type": "#Microsoft.Graph.Message" },
    }] }),
  });
  assert.equal(response.status, 202, await response.text());
  const jobs = await withPostgresTransaction(
    fixture.appPool,
    { tenant_id: TENANT, readOnly: true },
    async (client) => (await client.query(
      "SELECT status,job_kind FROM lawos_email_dms.graph_notification_jobs",
    )).rows,
  );
  assert.deepEqual(jobs, [{ status: "pending", job_kind: "message_notification" }]);

  const lifecycle = await fetch(`${base}/api/outlook/graph/notifications`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ value: [{
      subscriptionId: PROVIDER_SUBSCRIPTION,
      tenantId: ENTRA_TENANT,
      clientState: CLIENT_STATE,
      subscriptionExpirationDateTime: EXPIRES_AT,
      lifecycleEvent: "missed",
    }] }),
  });
  assert.equal(lifecycle.status, 202, await lifecycle.text());
  const maintenance = await handleOutlookConversationMaintenanceEvent({
    maintenance_action: LAWOS_OUTLOOK_CONVERSATION_WORKER_ACTION,
  }, {
    runtime_factory: async () => started,
    env: { LAWOS_IDENTITY_TENANT_ID: TENANT },
  });
  assert.equal(maintenance.worker, LAWOS_OUTLOOK_CONVERSATION_WORKER_ACTION);
  assert.deepEqual(maintenance.subscription_reconciliation, { attempted: 1, succeeded: 1, failed: 0 });
  assert.equal(maintenance.subscription_jobs.claimed, 0);
  assert.equal(maintenance.recovery_jobs.claimed, 1);
  assert.equal(maintenance.recovery_jobs.outcomes[0].status, "completed");
  assert.match(maintenance.recovery_jobs.outcomes[0].job_id, /^graph_job_[a-f0-9]{32}$/u);
  assert.deepEqual(maintenance.message_jobs, {
    claimed: 1, filed: 1, ignored: 0, paused: 0, retried: 0, dead_lettered: 0,
  });
  const recovered = await withPostgresTransaction(
    fixture.appPool,
    { tenant_id: TENANT, readOnly: true },
    async (client) => ({
      jobs: (await client.query(
        "SELECT job_kind,status FROM lawos_email_dms.graph_notification_jobs ORDER BY job_kind",
      )).rows,
      cursor: (await client.query(
        "SELECT cursor_ref FROM lawos_email_dms.graph_delta_cursors",
      )).rows[0].cursor_ref,
      subscriptions: Number((await client.query(
        "SELECT count(*)::int AS count FROM lawos_email_dms.graph_subscriptions WHERE status='active'",
      )).rows[0].count),
      thread: (await client.query(
        "SELECT payload FROM lawos_domain.records WHERE domain_id='dms-auxiliary' AND record_type='DmsEmailThread'",
      )).rows[0]?.payload,
    }),
  );
  assert.deepEqual(recovered.jobs, [
    { job_kind: "delta_reconciliation", status: "completed" },
    { job_kind: "message_notification", status: "completed" },
  ]);
  assert.equal(recovered.subscriptions, 2);
  assert.match(recovered.cursor, /^sealed:v1:/u);
  assert.equal(JSON.stringify(recovered).includes("operational-never-store-plaintext"), false);
  assert.equal(recovered.thread.conversation_id, "conversation-outm27-operational");
  assert.equal(recovered.thread.matter_id, "matter-outm27-operational");
  assert.equal(recovered.thread.filing_user, "outlook-conversation-sync-service");
  assert.equal(recovered.thread.filing_mode, "manual");
  assert.equal(recovered.thread.sent_at, "2026-08-08T00:00:01.000Z");
  assert.deepEqual(recovered.thread.to.map(({ address }) => address), [MAILBOX]);
  await new Promise((resolve) => started.server.close(resolve));
  assert.equal(context.isPoolClosed(), true);
});
