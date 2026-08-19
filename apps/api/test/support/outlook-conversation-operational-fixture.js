import { createHash } from "node:crypto";

import { createLocalStorageAdapter } from "../../../../packages/dms/src/storage/local-storage-adapter.js";
import { startApiServer } from "../../src/server.js";
import { createOutlookAuthorityPostgresFixture } from "./outlook-authority-postgres-fixture.js";
import {
  CLIENT_STATE,
  ENTRA_TENANT,
  EXPIRES_AT,
  MAILBOX,
  NOTIFICATION_URL,
  PROVIDER_SUBSCRIPTION,
  RESOURCE,
  seedOperationalConversationFixture,
  SUBJECT,
  TENANT,
} from "./outlook-conversation-operational-data.js";

export const SENT_MIME = Buffer.from(
  "From: outm27-operational@example.test\r\n"
  + "To: recipient@example.test\r\n"
  + "Cc: cc@example.test\r\n"
  + "Bcc: bcc@example.test\r\n"
  + "Subject: Operational sent message\r\n"
  + "Message-ID: <message-outm27-sent@example.test>\r\n\r\nsent body",
);

function graphMessage(input) {
  if (input.rest_message_id === "message-outm27-sent") {
    return {
      mime_bytes: SENT_MIME,
      immutable_message_id: "message-outm27-sent",
      internet_message_id: "<message-outm27-sent@example.test>",
      provider_request_id: "provider-request-outm27-sent",
      message_metadata: {
        conversation_id: "conversation-outm27-sent",
        internet_message_id: "<message-outm27-sent@example.test>",
        subject: "Operational sent message",
        sender: { address: MAILBOX }, from: { address: MAILBOX },
        recipients: [
          { recipient_type: "to", address: "recipient@example.test" },
          { recipient_type: "cc", address: "cc@example.test" },
          { recipient_type: "bcc", address: "bcc@example.test" },
        ],
        received_at: "2026-08-08T00:10:02.000Z",
        sent_at: "2026-08-08T00:10:01.000Z",
        folder_kind: "sentitems", is_in_sent_items: true,
        is_draft: false, has_attachments: false,
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
      sender: { address: "sender@example.test" }, from: { address: "sender@example.test" },
      recipients: [{ recipient_type: "to", address: MAILBOX }],
      received_at: "2026-08-08T00:00:02.000Z",
      sent_at: "2026-08-08T00:00:01.000Z",
      folder_kind: "inbox", is_in_sent_items: false,
      is_draft: false, has_attachments: false,
    },
  };
}

export async function createOperationalConversationFixture(t) {
  const fixture = await createOutlookAuthorityPostgresFixture(t, { appPoolMax: 8 });
  if (!fixture) return null;
  await seedOperationalConversationFixture(fixture);
  let poolClosed = false;
  const pool = {
    query: fixture.appPool.query.bind(fixture.appPool),
    connect: fixture.appPool.connect.bind(fixture.appPool),
    end: async () => { poolClosed = true; },
  };
  const providerCalls = [];
  const clientStatesByProvider = new Map([[PROVIDER_SUBSCRIPTION, CLIENT_STATE]]);
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
  const conversationProvider = {};
  conversationProvider.listOwnMessageSubscriptions = async (input) => {
    providerCalls.push({ method: "listOwnMessageSubscriptions", input });
    return structuredClone(remoteSubscriptions);
  };
  conversationProvider.createOwnMessageSubscription = async (input) => {
    providerCalls.push({ method: "createOwnMessageSubscription", input });
    const created = {
      provider_subscription_id: `provider-created-${remoteSubscriptions.length}`,
      resource: input.resource, change_type: "created", client_state_hash: input.client_state_hash,
      notification_url: NOTIFICATION_URL, entra_tenant_id: ENTRA_TENANT,
      account_id: SUBJECT, expires_at: input.expiration_datetime,
    };
    remoteSubscriptions.push(created);
    clientStatesByProvider.set(created.provider_subscription_id, input.client_state);
    return structuredClone(created);
  };
  conversationProvider.renewOwnMessageSubscription = async (input) => {
    providerCalls.push({ method: "renewOwnMessageSubscription", input });
    const existing = remoteSubscriptions.find(({ provider_subscription_id: id }) => id === input.provider_subscription_id);
    return { ...structuredClone(existing), expires_at: input.expiration_datetime };
  };
  conversationProvider.deleteOwnMessageSubscription = async (input) => {
    providerCalls.push({ method: "deleteOwnMessageSubscription", input });
    const index = remoteSubscriptions.findIndex(({ provider_subscription_id: id }) => id === input.provider_subscription_id);
    if (index >= 0) remoteSubscriptions.splice(index, 1);
    return { deleted: true };
  };
  conversationProvider.listOwnMessageDelta = async (input) => {
    providerCalls.push({ method: "listOwnMessageDelta", input });
    return { messages: [], delta_link: "https://graph.microsoft.com/v1.0/me/mailFolders/inbox/messages/delta?$deltatoken=operational-never-store-plaintext" };
  };
  conversationProvider.getMeMessageMime = async (input) => {
    providerCalls.push({ method: "getMeMessageMime", input });
    return graphMessage(input);
  };
  let credentialResolveCount = 0;
  const credentialVault = {
    async resolveDelegatedCredential() {
      credentialResolveCount += 1;
      return {
        access_token: "outm27-operational-access-token",
        refresh_token: "outm27-operational-refresh-token",
        refresh_profile: "client", refresh_profile_proof: "d".repeat(43),
        mailbox_address: MAILBOX, expires_at: "2027-08-08T00:00:00.000Z",
        granted_scopes: ["Mail.Read"],
      };
    },
  };
  const dmsStorage = createLocalStorageAdapter({ adapter_id: "outm27-operational-test" });
  const started = await startApiServer({
    port: 0, runtimeProfile: "operational",
    sessionSecret: "outm27-operational-session-secret-material",
    stepUpAuthority: Object.freeze({}), staffAuthAuthority: "internal-password",
    persistenceAuthority: "postgres-v2",
    outlookDesktopEntitlementEnabled: false,
    persistenceAuthorityEnv: {
      LAWOS_POSTGRES_URL_SECRET_ID: "lawos/test/outm27-operational",
      LAWOS_POSTGRES_TENANT_CONTEXT_SECRET_ID: "lawos/test/outm27-operational-tenant-context",
      LAWOS_PAYROLL_ARTIFACT_KEY_SECRET_ID: "lawos/test/outm27-operational-payroll",
      LAWOS_IDENTITY_TENANT_ID: TENANT,
      LAWOS_GRAPH_NOTIFICATION_URL: NOTIFICATION_URL,
      LAWOS_OUTLOOK_CONVERSATION_WORKER_SCHEDULE_ENABLED: "true",
      LAWOS_DATA_SCOPE: "synthetic-only", AWS_REGION: "ap-northeast-2",
    },
    persistenceResolvePostgresSecret: async ({ secretId }) => secretId.endsWith("tenant-context")
      ? fixture.tenantContextSecret : fixture.instance.connection_string,
    persistenceConnectPostgres: async () => pool,
    dmsStorage,
    payrollResolveArtifactSecret: async () => "outm27-operational-payroll-artifact-secret-material",
    m365GraphConfig: {
      feature_enabled: true, provider_runtime_enabled: true,
      entra_tenant_id: ENTRA_TENANT, credential_vault: credentialVault,
      provider: conversationProvider,
    },
  });
  t.after(() => started.server.listening
    ? new Promise((resolve) => started.server.close(resolve)) : undefined);
  return {
    fixture, started, base: `http://${started.host}:${started.port}`,
    providerCalls, clientStatesByProvider, remoteSubscriptions,
    conversationProvider, credentialVault, dmsStorage,
    getCredentialResolveCount: () => credentialResolveCount,
    isPoolClosed: () => poolClosed,
  };
}
