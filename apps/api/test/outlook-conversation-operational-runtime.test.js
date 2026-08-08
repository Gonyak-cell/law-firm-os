import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import test from "node:test";

import { createLocalStorageAdapter } from "../../../packages/dms/src/storage/local-storage-adapter.js";
import { EMAIL_DMS_DOMAIN_DESCRIPTOR } from "../../../packages/email-dms/src/central-ledger.js";
import { m365ConnectionId } from "../../../packages/email-dms/src/m365-connection-model.js";
import { createEmailDmsRepository } from "../../../packages/email-dms/src/repository.js";
import { MATTER_DOMAIN_DESCRIPTOR } from "../../../packages/matter/src/central-ledger.js";
import { createMatterRepository } from "../../../packages/matter/src/repository.js";
import { createHrxDomainSnapshot } from "../../../packages/hrx/src/postgres-store-v2.js";
import { runHrxMigrations } from "../../../packages/hrx/src/migrations/index.js";
import { createFileHrxStore } from "../../../packages/hrx/src/store/file-store.js";
import { createPostgresDomainLedger } from "../../../packages/persistence/src/postgres/domain-ledger.js";
import { createRecordRepositoryDomainSnapshot } from "../../../packages/persistence/src/record-domain-adapter.js";
import { withPostgresTransaction } from "../../../packages/persistence/src/postgres/transaction.js";
import { createMigratedPostgresFixture } from "../../../packages/persistence/test/helpers/disposable-postgres.js";
import { runClientOperationsPostgresMigrations } from "../src/client-operations-schema.js";
import { createPostgresOutlookConversationRuntime } from "../src/outlook-conversation-operational-runtime.js";
import { startApiServer } from "../src/server.js";
import {
  handleOutlookConversationMaintenanceEvent,
  LAWOS_OUTLOOK_CONVERSATION_WORKER_ACTION,
} from "../src/outlook-conversation-maintenance-invocation.js";

const TENANT = "tenant-outm27-operational";
const ENTRA_TENANT = "entra-tenant-outm27-operational";
const SUBJECT = "subject-outm27-operational";
const CONNECTION = m365ConnectionId({ tenant_id: TENANT, user_id: "user-outm27-operational" });
const SUBSCRIPTION = "subscription-outm27-operational";
const PROVIDER_SUBSCRIPTION = "provider-outm27-operational";
const RESOURCE = "me/mailFolders('inbox')/messages";
const NOTIFICATION_URL = "https://api.example.test/api/outlook/graph/notifications";
const CLIENT_STATE = "client-state-outm27-operational";
const EXPIRES_AT = "2027-08-08T02:00:00.000Z";
const MAILBOX = "outm27-operational@example.test";
const MAILBOX_HASH = createHash("sha256").update(MAILBOX).digest("hex");

async function seed(fixture) {
  await runClientOperationsPostgresMigrations(fixture.adminPool);
  const ledger = createPostgresDomainLedger({ pool: fixture.appPool });
  const hrxStore = createFileHrxStore();
  try {
    runHrxMigrations(hrxStore);
    await ledger.importSnapshot(createHrxDomainSnapshot({ store: hrxStore, tenant_id: TENANT }).snapshot);
  } finally {
    hrxStore.close();
  }
  const repository = createEmailDmsRepository({ seedRecords: [{
    model_type: "M365Connection",
    tenant_id: TENANT,
    m365_connection_id: CONNECTION,
    user_id: "user-outm27-operational",
    entra_subject_id: SUBJECT,
    mailbox_address_hash: MAILBOX_HASH,
    credential_ref: "aws-secrets-manager:synthetic/outm27-operational",
    granted_scopes: ["Mail.Read"],
    consented_at: "2026-08-08T00:00:00.000Z",
    expires_at: "2027-08-08T00:00:00.000Z",
    state_version: 1,
  }] });
  try {
    await ledger.importSnapshot(createRecordRepositoryDomainSnapshot({
      descriptor: EMAIL_DMS_DOMAIN_DESCRIPTOR,
      repositories: [{ source_id: "outm27-operational-test", repository }],
      tenant_id: TENANT,
    }).snapshot);
  } finally {
    repository.close();
  }
  const matterRepository = createMatterRepository({ seedRecords: [
    {
      model_type: "Matter",
      tenant_id: TENANT,
      matter_id: "matter-outm27-operational",
      client_id: "client-outm27-operational",
      title: "OUTM-27 operational Matter",
      status: "open",
      created_by: "user-outm27-operational",
      created_at: "2026-08-08T00:00:00.000Z",
      permission_envelope_id: "perm-outm27-operational",
      audit_trace_id: "audit-outm27-operational",
    },
    {
      model_type: "MatterMember",
      tenant_id: TENANT,
      matter_id: "matter-outm27-operational",
      member_id: "member-outm27-operational",
      user_id: "user-outm27-operational",
      role: "associate",
      status: "active",
      permission_envelope_id: "perm-outm27-operational",
      audit_trace_id: "audit-outm27-operational",
    },
  ] });
  try {
    await ledger.importSnapshot(createRecordRepositoryDomainSnapshot({
      descriptor: MATTER_DOMAIN_DESCRIPTOR,
      repositories: [{ source_id: "outm27-operational-matter-test", repository: matterRepository }],
      tenant_id: TENANT,
    }).snapshot);
  } finally {
    matterRepository.close();
  }
  await withPostgresTransaction(fixture.appPool, { tenant_id: TENANT }, async (client) => {
    await client.query(
      `INSERT INTO lawos_email_dms.conversation_policies
       (tenant_id,policy_id,user_id,entra_subject_id,m365_connection_id,mailbox_ref,
        conversation_id,matter_id,seed_email_thread_id,seed_filing_receipt_ref,
        enabling_actor_id,status,version,created_at,updated_at)
     VALUES ($1,'policy-outm27-operational','user-outm27-operational',$2,$3,$4,
             'conversation-outm27-operational','matter-outm27-operational',
             'thread-outm27-operational','receipt-outm27-operational',
             'user-outm27-operational','active',1,
             '2026-08-08T00:00:00.000Z','2026-08-08T00:00:00.000Z')`,
      [TENANT, SUBJECT, CONNECTION, MAILBOX_HASH],
    );
    await client.query(
      `INSERT INTO lawos_email_dms.graph_subscriptions
       (tenant_id,subscription_id,user_id,entra_subject_id,entra_tenant_id,
        m365_connection_id,mailbox_ref,resource,change_type,client_state_hash,
        client_state_ref,notification_url_hash,provider_subscription_id,provider_expires_at,status,
        created_at,updated_at)
     VALUES ($1,$2,'user-outm27-operational',$3,$4,$5,$6,$7,'created',$8,$9,$10,$11,$12,
             'active','2026-08-08T00:00:00.000Z','2026-08-08T00:00:00.000Z')`,
      [TENANT, SUBSCRIPTION, SUBJECT, ENTRA_TENANT, CONNECTION, MAILBOX_HASH, RESOURCE,
        createHash("sha256").update(CLIENT_STATE).digest("hex"), `client_state_ref_${"c".repeat(32)}`,
        createHash("sha256").update(new URL(NOTIFICATION_URL).toString()).digest("hex"),
        PROVIDER_SUBSCRIPTION, EXPIRES_AT],
    );
  });
}

test("OUTM-27 operational server composes the migrated PostgreSQL webhook and reports readiness", async (t) => {
  const fixture = await createMigratedPostgresFixture(t, { appPoolMax: 8 });
  if (!fixture) return;
  await seed(fixture);
  let closed = false;
  const pool = {
    query: fixture.appPool.query.bind(fixture.appPool),
    connect: fixture.appPool.connect.bind(fixture.appPool),
    end: async () => { closed = true; },
  };
  const providerCalls = [];
  const clientStatesByProvider = new Map([
    [PROVIDER_SUBSCRIPTION, CLIENT_STATE],
  ]);
  const remoteSubscriptions = [{
    provider_subscription_id: PROVIDER_SUBSCRIPTION,
    resource: RESOURCE,
    change_type: "created",
    client_state_hash: createHash("sha256").update(CLIENT_STATE).digest("hex"),
    notification_url: NOTIFICATION_URL,
    entra_tenant_id: ENTRA_TENANT,
    account_id: SUBJECT,
    expires_at: EXPIRES_AT,
  }];
  const conversationProvider = Object.fromEntries([
    "createOwnMessageSubscription",
    "renewOwnMessageSubscription",
    "listOwnMessageSubscriptions",
    "deleteOwnMessageSubscription",
    "listOwnMessageDelta",
  ].map((method) => [method, async (input) => {
    providerCalls.push({ method, input });
    if (method === "listOwnMessageSubscriptions") return structuredClone(remoteSubscriptions);
    if (method === "createOwnMessageSubscription") {
      const created = {
        provider_subscription_id: `provider-created-${remoteSubscriptions.length}`,
        resource: input.resource,
        change_type: "created",
        client_state_hash: input.client_state_hash,
        notification_url: NOTIFICATION_URL,
        entra_tenant_id: ENTRA_TENANT,
        account_id: SUBJECT,
        expires_at: input.expiration_datetime,
      };
      remoteSubscriptions.push(created);
      clientStatesByProvider.set(created.provider_subscription_id, input.client_state);
      return structuredClone(created);
    }
    if (method === "renewOwnMessageSubscription") {
      const existing = remoteSubscriptions.find(({ provider_subscription_id: id }) => id === input.provider_subscription_id);
      return { ...structuredClone(existing), expires_at: input.expiration_datetime };
    }
    if (method === "deleteOwnMessageSubscription") {
      const index = remoteSubscriptions.findIndex(({ provider_subscription_id: id }) => id === input.provider_subscription_id);
      if (index >= 0) remoteSubscriptions.splice(index, 1);
      return { deleted: true };
    }
    if (method === "listOwnMessageDelta") {
      return {
        messages: [],
        delta_link: "https://graph.microsoft.com/v1.0/me/mailFolders/inbox/messages/delta?$deltatoken=operational-never-store-plaintext",
      };
    }
    return {};
  }]));
  const sentMime = Buffer.from(
    "From: outm27-operational@example.test\r\n"
    + "To: recipient@example.test\r\n"
    + "Cc: cc@example.test\r\n"
    + "Bcc: bcc@example.test\r\n"
    + "Subject: Operational sent message\r\n"
    + "Message-ID: <message-outm27-sent@example.test>\r\n\r\nsent body",
  );
  conversationProvider.getMeMessageMime = async (input) => {
    providerCalls.push({ method: "getMeMessageMime", input });
    if (input.rest_message_id === "message-outm27-sent") {
      return {
        mime_bytes: sentMime,
        immutable_message_id: "message-outm27-sent",
        internet_message_id: "<message-outm27-sent@example.test>",
        provider_request_id: "provider-request-outm27-sent",
        message_metadata: {
          conversation_id: "conversation-outm27-sent",
          internet_message_id: "<message-outm27-sent@example.test>",
          subject: "Operational sent message",
          sender: { address: MAILBOX },
          from: { address: MAILBOX },
          recipients: [
            { recipient_type: "to", address: "recipient@example.test" },
            { recipient_type: "cc", address: "cc@example.test" },
            { recipient_type: "bcc", address: "bcc@example.test" },
          ],
          received_at: "2026-08-08T00:10:02.000Z",
          sent_at: "2026-08-08T00:10:01.000Z",
          folder_kind: "sentitems",
          is_in_sent_items: true,
          is_draft: false,
          has_attachments: false,
        },
      };
    }
    return {
      mime_bytes: Buffer.from("From: sender@example.test\r\nTo: outm27-operational@example.test\r\nSubject: Operational message\r\nMessage-ID: <message-outm27-operational@example.test>\r\n\r\nbody"),
      immutable_message_id: "message-outm27-operational",
      internet_message_id: "<message-outm27-operational@example.test>",
      provider_request_id: "provider-request-outm27-operational",
      message_metadata: {
        conversation_id: "conversation-outm27-operational",
        internet_message_id: "<message-outm27-operational@example.test>",
        subject: "Operational message",
        sender: { address: "sender@example.test" },
        from: { address: "sender@example.test" },
        recipients: [{ recipient_type: "to", address: MAILBOX }],
        received_at: "2026-08-08T00:00:02.000Z",
        sent_at: "2026-08-08T00:00:01.000Z",
        folder_kind: "inbox",
        is_in_sent_items: false,
        is_draft: false,
        has_attachments: false,
      },
    };
  };
  let credentialResolveCount = 0;
  const credentialVault = {
    async resolveDelegatedCredential() {
      credentialResolveCount += 1;
      return {
        access_token: "outm27-operational-access-token",
        refresh_token: "outm27-operational-refresh-token",
        refresh_profile: "client",
        refresh_profile_proof: "d".repeat(43),
        mailbox_address: MAILBOX,
        expires_at: "2027-08-08T00:00:00.000Z",
        granted_scopes: ["Mail.Read"],
      };
    },
  };
  const dmsStorage = createLocalStorageAdapter({
    adapter_id: "outm27-operational-test",
  });
  const started = await startApiServer({
    port: 0,
    runtimeProfile: "operational",
    sessionSecret: "outm27-operational-session-secret-material",
    stepUpAuthority: Object.freeze({}),
    staffAuthAuthority: "internal-password",
    persistenceAuthority: "postgres-v2",
    persistenceAuthorityEnv: {
      LAWOS_POSTGRES_URL_SECRET_ID: "lawos/test/outm27-operational",
      LAWOS_POSTGRES_TENANT_CONTEXT_SECRET_ID: "lawos/test/outm27-operational-tenant-context",
      LAWOS_PAYROLL_ARTIFACT_KEY_SECRET_ID: "lawos/test/outm27-operational-payroll",
      LAWOS_IDENTITY_TENANT_ID: TENANT,
      LAWOS_GRAPH_NOTIFICATION_URL: NOTIFICATION_URL,
      LAWOS_OUTLOOK_CONVERSATION_WORKER_SCHEDULE_ENABLED: "true",
      LAWOS_DATA_SCOPE: "synthetic-only",
      AWS_REGION: "ap-northeast-2",
    },
    persistenceResolvePostgresSecret: async ({ secretId }) => secretId.endsWith("tenant-context")
      ? fixture.tenantContextSecret
      : fixture.instance.connection_string,
    persistenceConnectPostgres: async () => pool,
    dmsStorage,
    payrollResolveArtifactSecret: async () => "outm27-operational-payroll-artifact-secret-material",
    m365GraphConfig: {
      feature_enabled: true,
      provider_runtime_enabled: true,
      entra_tenant_id: ENTRA_TENANT,
      credential_vault: credentialVault,
      provider: conversationProvider,
    },
  });
  t.after(() => started.server.listening
    ? new Promise((resolve) => started.server.close(resolve))
    : undefined);
  assert.equal(started.outlookConversationRuntime.authority, "postgres-outlook-conversation-sync");
  const base = `http://${started.host}:${started.port}`;
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
  const jobs = await withPostgresTransaction(fixture.appPool, { tenant_id: TENANT, readOnly: true }, async (client) => (
    await client.query("SELECT status,job_kind FROM lawos_email_dms.graph_notification_jobs")
  ).rows);
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
  const recovered = await withPostgresTransaction(fixture.appPool, { tenant_id: TENANT, readOnly: true }, async (client) => ({
    jobs: (await client.query("SELECT job_kind,status FROM lawos_email_dms.graph_notification_jobs ORDER BY job_kind")).rows,
    cursor: (await client.query("SELECT cursor_ref FROM lawos_email_dms.graph_delta_cursors")).rows[0].cursor_ref,
    subscriptions: Number((await client.query("SELECT count(*)::int AS count FROM lawos_email_dms.graph_subscriptions WHERE status='active'")).rows[0].count),
  }));
  assert.deepEqual(recovered.jobs, [
    { job_kind: "delta_reconciliation", status: "completed" },
    { job_kind: "message_notification", status: "completed" },
  ]);
  assert.equal(recovered.subscriptions, 2);
  assert.match(recovered.cursor, /^sealed:v1:/u);
  assert.equal(JSON.stringify(recovered).includes("operational-never-store-plaintext"), false);
  const filing = maintenance.message_jobs;
  const filingJob = await withPostgresTransaction(fixture.appPool, { tenant_id: TENANT, readOnly: true }, async (client) => (
    await client.query("SELECT status,result_code,last_error_code FROM lawos_email_dms.graph_notification_jobs WHERE job_kind='message_notification'")
  ).rows[0]);
  assert.deepEqual(filing, {
    claimed: 1,
    filed: 1,
    ignored: 0,
    paused: 0,
    retried: 0,
    dead_lettered: 0,
  }, JSON.stringify(filingJob));
  const filed = await withPostgresTransaction(fixture.appPool, { tenant_id: TENANT, readOnly: true }, async (client) => ({
    job: (await client.query("SELECT status,result_code FROM lawos_email_dms.graph_notification_jobs WHERE job_kind='message_notification'")).rows[0],
    thread: (await client.query("SELECT payload FROM lawos_domain.records WHERE domain_id='dms-auxiliary' AND record_type='DmsEmailThread'")).rows[0]?.payload,
  }));
  assert.deepEqual(filed.job, { status: "completed", result_code: "filed" });
  assert.equal(filed.thread.conversation_id, "conversation-outm27-operational");
  assert.equal(filed.thread.matter_id, "matter-outm27-operational");
  assert.equal(filed.thread.filing_user, "outlook-conversation-sync-service");
  assert.equal(filed.thread.sent_at, "2026-08-08T00:00:01.000Z");
  assert.deepEqual(filed.thread.to.map(({ address }) => address), [MAILBOX]);

  const sentRemote = remoteSubscriptions.find(({ resource }) => resource === "me/mailFolders('sentitems')/messages");
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
  const sentJobAfterMaintenance = await withPostgresTransaction(
    fixture.appPool,
    { tenant_id: TENANT, readOnly: true },
    async (client) => (await client.query(
      `SELECT status,result_code,last_error_code FROM lawos_email_dms.graph_notification_jobs
        WHERE message_id='message-outm27-sent'`,
    )).rows[0],
  );
  assert.deepEqual(sentMaintenance.message_jobs, {
    claimed: 1,
    filed: 1,
    ignored: 0,
    paused: 0,
    retried: 0,
    dead_lettered: 0,
  }, JSON.stringify(sentJobAfterMaintenance));
  const sentSha256 = createHash("sha256").update(sentMime).digest("hex");
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
  assert.equal(sentFiled.thread.sent_at, "2026-08-08T00:10:01.000Z");
  assert.equal(sentFiled.thread.received_at, "2026-08-08T00:10:02.000Z");
  assert.deepEqual(sentFiled.thread.to.map(({ address }) => address), ["recipient@example.test"]);
  assert.deepEqual(sentFiled.thread.cc.map(({ address }) => address), ["cc@example.test"]);
  assert.deepEqual(sentFiled.thread.bcc.map(({ address }) => address), ["bcc@example.test"]);
  assert.deepEqual(sentFiled.file, {
    object_id: sentFiled.file.object_id,
    sha256: sentSha256,
    byte_size: String(sentMime.byteLength),
    content_type: "message/rfc822",
    status: "committed",
  });
  const storedSent = dmsStorage.getObject({ tenant_id: TENANT, object_id: sentFiled.file.object_id });
  assert.equal(storedSent.sha256, sentSha256);
  assert.deepEqual(storedSent.bytes, sentMime);

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
  const credentialCountBeforeLoss = credentialResolveCount;
  const connectionLoss = await started.outlookConversationRuntime.message_worker.runOnce({
    tenant_id: TENANT,
    worker_id: "worker-outm27-connection-lost",
    limit: 1,
  });
  assert.equal(connectionLoss.paused, 1);
  assert.equal(credentialResolveCount, credentialCountBeforeLoss);
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
  await new Promise((resolve) => started.server.close(resolve));
  assert.equal(closed, true);
});
