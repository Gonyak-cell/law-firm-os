import { createHash } from "node:crypto";
import { createGraphCursorCodec } from "../../../packages/email-dms/src/graph-cursor-codec.js";
import { createGraphDeltaReconciliationService } from "../../../packages/email-dms/src/graph-delta-reconciliation-service.js";
import { createPostgresConversationSyncStore } from "../../../packages/email-dms/src/postgres-conversation-sync-store.js";
import { createPostgresGraphNotificationQueue } from "../../../packages/email-dms/src/postgres-graph-notification-queue.js";
import { createPostgresConversationPolicyService } from "../../../packages/email-dms/src/postgres-conversation-policy-service.js";
import { createPostgresConversationMaintenanceStore } from "../../../packages/email-dms/src/postgres-conversation-maintenance-store.js";
import { createPostgresGraphSubscriptionService } from "../../../packages/email-dms/src/postgres-graph-subscription-service.js";
import { requiredSyncString } from "../../../packages/email-dms/src/conversation-sync-model.js";
import { createOutlookGraphWebhookHandler } from "./outlook-graph-webhook.js";
import { verifyClientOperationsPostgresMigrations } from "./client-operations-schema.js";
import {
  createPostgresM365ConversationCleanupPort,
  createPostgresM365ConversationPort,
} from "./postgres-m365-conversation-port.js";
import { createPostgresM365MailPort } from "./postgres-m365-mail-port.js";
import { createOutlookConversationRecoveryWorker } from "./outlook-conversation-recovery-worker.js";
import { createOutlookConversationSubscriptionWorker } from "./outlook-conversation-subscription-worker.js";
import { createOutlookConversationCanonicalMessageSource } from "./outlook-conversation-canonical-message.js";
import { createOutlookConversationMessageWorker } from "./outlook-conversation-message-worker.js";
import { createOutlookConversationFilingRuntime } from "./outlook-conversation-filing-runtime.js";
import { createOutlookConversationMaintenanceWorker } from "./outlook-conversation-maintenance-worker.js";
import { verifyConversationWorkerAuthority } from "./outlook-conversation-current-authority.js";

const REQUIRED_MIGRATION = "303_client_outlook_conversation_sync";
const WORKER_LEASE_MS = 15 * 60_000;
export const LAWOS_OUTLOOK_CONVERSATION_WORKER_SCHEDULE_ENABLED_ENV =
  "LAWOS_OUTLOOK_CONVERSATION_WORKER_SCHEDULE_ENABLED";

function cursorKey(material) {
  const bytes = Buffer.isBuffer(material) ? material : Buffer.from(String(material ?? ""), "utf8");
  if (bytes.byteLength < 32) throw new TypeError("Outlook Graph cursor key material must contain at least 32 bytes");
  return createHash("sha256").update("lawos:outlook-graph-cursor:v1\0").update(bytes).digest();
}

export async function createPostgresOutlookConversationRuntime({
  pool,
  domain_ledger,
  tenant_id,
  entra_tenant_id,
  notification_url,
  cursor_key_material,
  credential_vault,
  conversation_provider,
  request_runtime_authority,
  worker_schedule_enabled = false,
  clock = () => new Date(),
  verify_migrations = verifyClientOperationsPostgresMigrations,
} = {}) {
  if (!pool?.connect || typeof domain_ledger?.transaction !== "function"
    || typeof request_runtime_authority?.run !== "function"
    || typeof verify_migrations !== "function") throw new TypeError("PostgreSQL Outlook conversation runtime dependencies are required");
  if (typeof worker_schedule_enabled !== "boolean") {
    throw new TypeError("worker_schedule_enabled must be boolean");
  }
  const tenantId = requiredSyncString({ tenant_id }, "tenant_id");
  const entraTenantId = requiredSyncString({ entra_tenant_id }, "entra_tenant_id");
  const migrations = await verify_migrations(pool);
  const migration = migrations.find(({ id }) => id === REQUIRED_MIGRATION);
  if (!migration) throw new Error("Outlook conversation PostgreSQL migration is not ready");
  const codec = createGraphCursorCodec({ key: cursorKey(cursor_key_material) });
  const store = createPostgresConversationSyncStore({ pool, tenant_id: tenantId, cursor_codec: codec, clock });
  const queue = createPostgresGraphNotificationQueue({
    pool,
    clock,
    lease_ms: WORKER_LEASE_MS,
  });
  const policyService = createPostgresConversationPolicyService({ pool, tenant_id: tenantId, clock });
  const maintenanceStore = createPostgresConversationMaintenanceStore({ pool, tenant_id: tenantId, clock });
  const conversationPort = createPostgresM365ConversationPort({
    ledger: domain_ledger,
    tenant_id: tenantId,
    credential_vault,
    conversation_provider,
    clock,
  });
  const subscriptionCleanupPort = createPostgresM365ConversationCleanupPort({
    pool,
    ledger: domain_ledger,
    tenant_id: tenantId,
    entra_tenant_id: entraTenantId,
    credential_vault,
    conversation_provider,
    clock,
  });
  const mailPort = createPostgresM365MailPort({
    ledger: domain_ledger,
    tenant_id: tenantId,
    credential_vault,
    provider: conversation_provider,
    clock,
  });
  const subscriptionService = createPostgresGraphSubscriptionService({
    pool,
    tenant_id: tenantId,
    entra_tenant_id: entraTenantId,
    notification_url,
    state_lookup: store.readConnectionState,
    provider: conversationPort,
    cleanup_provider: subscriptionCleanupPort,
    clock,
  });
  const webhook = createOutlookGraphWebhookHandler({
    authority_lookup: async (input) => {
      const authority = await store.findWebhookAuthority(input);
      return authority?.subscription.entra_tenant_id === entraTenantId ? authority : null;
    },
    queue,
    notification_url,
    clock,
  });
  const deltaReconciler = createGraphDeltaReconciliationService({
    state_lookup: store.readReconciliationState,
    cursor_store: store.cursor_store,
    queue,
    provider: conversationPort,
    clock,
    max_pages: 20,
    recovery_window_ms: 7 * 24 * 60 * 60 * 1000,
  });
  const recoveryWorker = createOutlookConversationRecoveryWorker({
    queue,
    authority_lookup: store.findSubscriptionAuthority,
    delta_reconciler: deltaReconciler,
  });
  const subscriptionWorker = createOutlookConversationSubscriptionWorker({
    queue,
    authority_lookup: store.findSubscriptionAuthority,
    subscription_service: subscriptionService,
  });
  const canonicalSource = createOutlookConversationCanonicalMessageSource({ mail_port: mailPort });
  const filingRuntime = createOutlookConversationFilingRuntime({ request_runtime_authority, clock });
  const messageWorker = createOutlookConversationMessageWorker({
    queue,
    authority_lookup: store.findSubscriptionAuthority,
    canonical_message_source: canonicalSource,
    policy_lookup: ({ tenant_id: jobTenant, connection, conversation_id }) => store.findActivePolicy({
      tenant_id: jobTenant,
      user_id: connection.user_id,
      entra_subject_id: connection.entra_subject_id,
      m365_connection_id: connection.m365_connection_id,
      conversation_id,
    }),
    current_authority: ({ policy, connection }) => request_runtime_authority.run({
      tenant_id: policy.tenant_id,
      request_context: { method: "GET", pathname: "/internal/outlook/conversation-sync/authority", actor_id: "outlook-conversation-sync-service" },
      command: (runtimes) => verifyConversationWorkerAuthority({ runtimes, policy, connection, clock }),
    }),
    pause_policy: policyService.pause,
    pause_connection_policies: policyService.pauseConnectionPolicies,
    filing_adapter: filingRuntime,
    clock,
  });
  const maintenanceWorker = createOutlookConversationMaintenanceWorker({
    maintenance_store: maintenanceStore,
    subscription_service: subscriptionService,
    subscription_worker: subscriptionWorker,
    recovery_worker: recoveryWorker,
    message_worker: messageWorker,
  });
  const durableQueueReady = queue.durable === true;
  const maintenanceWorkerReady =
    typeof maintenanceWorker.runOnce === "function";
  const readiness = Object.freeze({
    status: "ready",
    persistence: "postgres-v2",
    migration_id: REQUIRED_MIGRATION,
    migration_checksum: migration.checksum,
    webhook_route_ready: true,
    durable_queue_ready: durableQueueReady,
    encrypted_cursor_ready: true,
    conversation_provider_ready: true,
    missed_notification_recovery_ready: true,
    policy_runtime_ready: true,
    subscription_reconciler_ready: true,
    message_auto_filing_ready: true,
    maintenance_worker_ready: maintenanceWorkerReady,
    worker_schedule_ready: worker_schedule_enabled,
    auto_filing_enabled: durableQueueReady
      && maintenanceWorkerReady
      && worker_schedule_enabled,
  });
  return Object.freeze({
    authority: "postgres-outlook-conversation-sync",
    clock,
    store,
    queue,
    webhook,
    policy_service: policyService,
    subscription_service: subscriptionService,
    conversation_port: conversationPort,
    subscription_cleanup_port: subscriptionCleanupPort,
    mail_port: mailPort,
    recovery_worker: recoveryWorker,
    subscription_worker: subscriptionWorker,
    message_worker: messageWorker,
    maintenance_worker: maintenanceWorker,
    before_connection_revoke:
      subscriptionService.cleanupBeforeConnectionRevoke,
    readiness,
  });
}
