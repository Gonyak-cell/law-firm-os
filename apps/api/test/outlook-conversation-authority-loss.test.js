import assert from "node:assert/strict";
import test from "node:test";

import { withPostgresTransaction } from "../../../packages/persistence/src/postgres/transaction.js";
import {
  CONNECTION,
  EXPIRES_AT,
  PROVIDER_SUBSCRIPTION,
  RESOURCE,
  SUBSCRIPTION,
  TENANT,
} from "./support/outlook-conversation-operational-data.js";
import { createOperationalConversationFixture } from "./support/outlook-conversation-operational-fixture.js";

test("OUTM-28 revoked connection pauses policy before credential resolution", async (t) => {
  const context = await createOperationalConversationFixture(t);
  if (!context) return;
  const { fixture, started } = context;
  await started.outlookConversationRuntime.queue.enqueue({
    tenant_id: TENANT,
    subscription_id: SUBSCRIPTION,
    provider_subscription_id: PROVIDER_SUBSCRIPTION,
    resource: RESOURCE,
    message_id: "message-outm27-connection-lost",
    change_type: "created",
    source: "webhook",
    received_at: "2026-08-08T00:20:00.000Z",
    subscription_expiration_at: EXPIRES_AT,
  });
  await withPostgresTransaction(fixture.appPool, { tenant_id: TENANT }, (client) =>
    client.query(
      `UPDATE lawos_domain.records
          SET payload=jsonb_set(payload,'{revoked_at}',to_jsonb($2::text),true)
        WHERE tenant_id=$1 AND domain_id='email-dms'
          AND record_type='M365Connection' AND record_id=$3`,
      [TENANT, "2026-08-08T00:19:00.000Z", CONNECTION],
    ));
  const credentialCountBeforeLoss = context.getCredentialResolveCount();
  const connectionLoss = await started.outlookConversationRuntime.message_worker.runOnce({
    tenant_id: TENANT,
    worker_id: "worker-outm27-connection-lost",
    limit: 1,
  });
  assert.equal(connectionLoss.paused, 1);
  assert.equal(context.getCredentialResolveCount(), credentialCountBeforeLoss);
  const paused = await withPostgresTransaction(
    fixture.appPool,
    { tenant_id: TENANT, readOnly: true },
    async (client) => ({
      policy: (await client.query(
        "SELECT status,pause_reason FROM lawos_email_dms.conversation_policies",
      )).rows[0],
      job: (await client.query(
        `SELECT status,result_code FROM lawos_email_dms.graph_notification_jobs
          WHERE message_id='message-outm27-connection-lost'`,
      )).rows[0],
      audit: (await client.query(
        `SELECT actor_id,details->>'reason' AS reason
           FROM lawos_email_dms.graph_sync_audit_events
          WHERE event_type='conversation_policy.paused'
          ORDER BY occurred_at DESC LIMIT 1`,
      )).rows[0],
    }),
  );
  assert.deepEqual(paused.policy, {
    status: "paused",
    pause_reason: "connection_revoked",
  });
  assert.deepEqual(paused.job, {
    status: "completed",
    result_code: "policies_paused_connection_revoked",
  });
  assert.deepEqual(paused.audit, {
    actor_id: "outlook-conversation-sync-service",
    reason: "connection_revoked",
  });
});
