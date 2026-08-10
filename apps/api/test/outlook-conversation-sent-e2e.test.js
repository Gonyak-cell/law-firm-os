import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import test from "node:test";

import { createPostgresDomainLedger } from "../../../packages/persistence/src/postgres/domain-ledger.js";
import { withPostgresTransaction } from "../../../packages/persistence/src/postgres/transaction.js";
import { createPostgresOutlookConversationRuntime } from "../src/outlook-conversation-operational-runtime.js";
import {
  handleOutlookConversationMaintenanceEvent,
  LAWOS_OUTLOOK_CONVERSATION_WORKER_ACTION,
} from "../src/outlook-conversation-maintenance-invocation.js";
import {
  CONNECTION,
  ENTRA_TENANT,
  MAILBOX_HASH,
  NOTIFICATION_URL,
  SUBJECT,
  TENANT,
} from "./support/outlook-conversation-operational-data.js";
import {
  createOperationalConversationFixture,
  SENT_MIME,
} from "./support/outlook-conversation-operational-fixture.js";

test("OUTM-27 Sent notification reaches canonical immutable MIME filing and deduplicates after restart", async (t) => {
  const context = await createOperationalConversationFixture(t);
  if (!context) return;
  const {
    base, clientStatesByProvider, conversationProvider, credentialVault,
    dmsStorage, fixture, remoteSubscriptions, started,
  } = context;
  await handleOutlookConversationMaintenanceEvent({
    maintenance_action: LAWOS_OUTLOOK_CONVERSATION_WORKER_ACTION,
  }, {
    runtime_factory: async () => started,
    env: { LAWOS_IDENTITY_TENANT_ID: TENANT },
  });
  const sentRemote = remoteSubscriptions.find(({ resource }) =>
    resource === "me/mailFolders('sentitems')/messages");
  assert.ok(sentRemote);
  const sentClientState = clientStatesByProvider.get(sentRemote.provider_subscription_id);
  assert.equal(typeof sentClientState, "string");
  await withPostgresTransaction(fixture.appPool, { tenant_id: TENANT }, (client) => client.query(
    `INSERT INTO lawos_email_dms.conversation_policies
       (tenant_id,policy_id,user_id,entra_subject_id,m365_connection_id,mailbox_ref,
        conversation_id,matter_id,seed_email_thread_id,seed_filing_receipt_ref,
        enabling_actor_id,status,version,created_at,updated_at)
     VALUES ($1,'policy-outm27-sent','user-outm27-operational',$2,$3,$4,
             'conversation-outm27-sent','matter-outm27-operational',
             'thread-outm27-sent','receipt-outm27-sent',
             'user-outm27-operational','active',1,
             '2026-08-08T00:10:00.000Z','2026-08-08T00:10:00.000Z')`,
    [TENANT, SUBJECT, CONNECTION, MAILBOX_HASH],
  ));
  const sentNotification = {
    subscriptionId: sentRemote.provider_subscription_id,
    tenantId: ENTRA_TENANT,
    clientState: sentClientState,
    subscriptionExpirationDateTime: sentRemote.expires_at,
    changeType: "created",
    resource: `Users/${SUBJECT}/Messages/message-outm27-sent`,
    resourceData: { id: "message-outm27-sent", "@odata.type": "#Microsoft.Graph.Message" },
  };
  const sentWebhook = await fetch(`${base}/api/outlook/graph/notifications`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ value: [sentNotification] }),
  });
  assert.equal(sentWebhook.status, 202, await sentWebhook.text());
  const sentMaintenance = await handleOutlookConversationMaintenanceEvent({
    maintenance_action: LAWOS_OUTLOOK_CONVERSATION_WORKER_ACTION,
  }, {
    runtime_factory: async () => started,
    env: { LAWOS_IDENTITY_TENANT_ID: TENANT },
  });
  assert.deepEqual(sentMaintenance.message_jobs, {
    claimed: 1, filed: 1, ignored: 0, paused: 0, retried: 0, dead_lettered: 0,
  });
  const sentSha256 = createHash("sha256").update(SENT_MIME).digest("hex");
  const sentFiled = await withPostgresTransaction(
    fixture.appPool,
    { tenant_id: TENANT, readOnly: true },
    async (client) => ({
      job: (await client.query(
        `SELECT status,result_code FROM lawos_email_dms.graph_notification_jobs
          WHERE message_id='message-outm27-sent'`,
      )).rows[0],
      thread: (await client.query(
        `SELECT payload FROM lawos_domain.records
          WHERE domain_id='dms-auxiliary' AND record_type='DmsEmailThread'
            AND payload->>'conversation_id'='conversation-outm27-sent'`,
      )).rows[0]?.payload,
      file: (await client.query(
        `SELECT object_id,sha256,byte_size,content_type,status
           FROM lawos_dms.file_objects WHERE sha256=$1`,
        [sentSha256],
      )).rows[0],
    }),
  );
  assert.deepEqual(sentFiled.job, { status: "completed", result_code: "filed" });
  assert.equal(sentFiled.thread.conversation_id, "conversation-outm27-sent");
  assert.equal(sentFiled.thread.matter_id, "matter-outm27-operational");
  assert.equal(sentFiled.thread.filing_user, "outlook-conversation-sync-service");
  assert.equal(sentFiled.thread.filing_mode, "sent");
  assert.equal(sentFiled.thread.sent_at, "2026-08-08T00:10:01.000Z");
  assert.equal(sentFiled.thread.received_at, "2026-08-08T00:10:02.000Z");
  assert.deepEqual(sentFiled.thread.to.map(({ address }) => address), ["recipient@example.test"]);
  assert.deepEqual(sentFiled.thread.cc.map(({ address }) => address), ["cc@example.test"]);
  assert.deepEqual(sentFiled.thread.bcc.map(({ address }) => address), ["bcc@example.test"]);
  assert.deepEqual(sentFiled.file, {
    object_id: sentFiled.file.object_id,
    sha256: sentSha256,
    byte_size: String(SENT_MIME.byteLength),
    content_type: "message/rfc822",
    status: "committed",
  });
  const storedSent = dmsStorage.getObject({ tenant_id: TENANT, object_id: sentFiled.file.object_id });
  assert.equal(storedSent.sha256, sentSha256);
  assert.deepEqual(storedSent.bytes, SENT_MIME);

  const restarted = await createPostgresOutlookConversationRuntime({
    pool: fixture.appPool,
    domain_ledger: createPostgresDomainLedger({ pool: fixture.appPool }),
    tenant_id: TENANT,
    entra_tenant_id: ENTRA_TENANT,
    notification_url: NOTIFICATION_URL,
    cursor_key_material: "outm27-operational-session-secret-material",
    credential_vault: credentialVault,
    conversation_provider: conversationProvider,
    request_runtime_authority: started.requestRuntimeAuthority,
  });
  assert.equal(restarted.readiness.durable_queue_ready, true);
  assert.equal(restarted.readiness.maintenance_worker_ready, true);
  assert.equal(restarted.readiness.worker_schedule_ready, false);
  assert.equal(restarted.readiness.auto_filing_enabled, false);
  const replayedSent = await restarted.webhook.handle({
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ value: [sentNotification] }),
  });
  assert.equal(replayedSent.status, 202);
  assert.deepEqual(replayedSent.body, { outcome: "accepted", enqueued: 0, duplicates: 1 });
  const replayWorker = await restarted.message_worker.runOnce({
    tenant_id: TENANT,
    worker_id: "worker-outm27-sent-replay",
    limit: 1,
  });
  assert.equal(replayWorker.claimed, 0);
  const sentCounts = await withPostgresTransaction(
    fixture.appPool,
    { tenant_id: TENANT, readOnly: true },
    async (client) => ({
      threads: Number((await client.query(
        `SELECT count(*)::int AS count FROM lawos_domain.records
          WHERE domain_id='dms-auxiliary' AND record_type='DmsEmailThread'
            AND payload->>'conversation_id'='conversation-outm27-sent'`,
      )).rows[0].count),
      files: Number((await client.query(
        "SELECT count(*)::int AS count FROM lawos_dms.file_objects WHERE sha256=$1",
        [sentSha256],
      )).rows[0].count),
    }),
  );
  assert.deepEqual(sentCounts, { threads: 1, files: 1 });
});
