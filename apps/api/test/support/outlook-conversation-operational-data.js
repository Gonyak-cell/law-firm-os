import { createHash } from "node:crypto";

import { EMAIL_DMS_DOMAIN_DESCRIPTOR } from "../../../../packages/email-dms/src/central-ledger.js";
import { m365ConnectionId } from "../../../../packages/email-dms/src/m365-connection-model.js";
import { createEmailDmsRepository } from "../../../../packages/email-dms/src/repository.js";
import { createHrxDomainSnapshot } from "../../../../packages/hrx/src/postgres-store-v2.js";
import { runHrxMigrations } from "../../../../packages/hrx/src/migrations/index.js";
import { createFileHrxStore } from "../../../../packages/hrx/src/store/file-store.js";
import { MATTER_DOMAIN_DESCRIPTOR } from "../../../../packages/matter/src/central-ledger.js";
import { createMatterRepository } from "../../../../packages/matter/src/repository.js";
import { createPostgresDomainLedger } from "../../../../packages/persistence/src/postgres/domain-ledger.js";
import { createRecordRepositoryDomainSnapshot } from "../../../../packages/persistence/src/record-domain-adapter.js";
import { withPostgresTransaction } from "../../../../packages/persistence/src/postgres/transaction.js";
import { runOutlookAuthorityPostgresMigrations } from "./outlook-authority-postgres-fixture.js";

export const TENANT = "tenant-outm27-operational";
export const ENTRA_TENANT = "entra-tenant-outm27-operational";
export const SUBJECT = "subject-outm27-operational";
export const CONNECTION = m365ConnectionId({ tenant_id: TENANT, user_id: "user-outm27-operational" });
export const SUBSCRIPTION = "subscription-outm27-operational";
export const PROVIDER_SUBSCRIPTION = "provider-outm27-operational";
export const RESOURCE = "me/mailFolders('inbox')/messages";
export const NOTIFICATION_URL = "https://api.example.test/api/outlook/graph/notifications";
export const CLIENT_STATE = "client-state-outm27-operational";
export const EXPIRES_AT = "2027-08-08T02:00:00.000Z";
export const MAILBOX = "outm27-operational@example.test";
export const MAILBOX_HASH = createHash("sha256").update(MAILBOX).digest("hex");

export async function seedOperationalConversationFixture(fixture) {
  await runOutlookAuthorityPostgresMigrations(fixture);
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
        client_state_ref,notification_url_hash,provider_subscription_id,
        provider_expires_at,status,created_at,updated_at)
     VALUES ($1,$2,'user-outm27-operational',$3,$4,$5,$6,$7,'created',$8,$9,$10,$11,$12,
             'active','2026-08-08T00:00:00.000Z','2026-08-08T00:00:00.000Z')`,
      [TENANT, SUBSCRIPTION, SUBJECT, ENTRA_TENANT, CONNECTION, MAILBOX_HASH, RESOURCE,
        createHash("sha256").update(CLIENT_STATE).digest("hex"), `client_state_ref_${"c".repeat(32)}`,
        createHash("sha256").update(new URL(NOTIFICATION_URL).toString()).digest("hex"),
        PROVIDER_SUBSCRIPTION, EXPIRES_AT],
    );
  });
}
