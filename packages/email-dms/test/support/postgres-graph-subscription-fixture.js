import { createPostgresDomainLedger } from "../../../persistence/src/postgres/domain-ledger.js";
import { createRecordRepositoryDomainSnapshot } from "../../../persistence/src/record-domain-adapter.js";
import { withPostgresTransaction } from "../../../persistence/src/postgres/transaction.js";
import { EMAIL_DMS_DOMAIN_DESCRIPTOR } from "../../src/central-ledger.js";
import { listEmailDmsPostgresMigrations } from "../../src/migrations/index.js";
import { createEmailDmsRepository } from "../../src/repository.js";

export const TENANT = "tenant-outm26-postgres";
export const USER = "user-outm26-postgres";
export const SUBJECT = "subject-outm26-postgres";
export const CONNECTION = "connection-outm26-postgres";
export const ENTRA_TENANT = "entra-tenant-outm26-postgres";
export const NOTIFICATION_URL =
  "https://api.example.test/api/outlook/graph/notifications";

export async function seedGraphSubscriptionFixture(fixture) {
  const migrations = listEmailDmsPostgresMigrations();
  await fixture.adminPool.query(migrations[0].sql);
  await fixture.adminPool.query(migrations[3].sql);
  const repository = createEmailDmsRepository({ seedRecords: [{
    model_type: "M365Connection",
    tenant_id: TENANT,
    m365_connection_id: CONNECTION,
    user_id: USER,
    entra_subject_id: SUBJECT,
    mailbox_address_hash: "a".repeat(64),
    credential_ref: "aws-secrets-manager:synthetic/outm26-postgres",
    granted_scopes: ["Mail.Read"],
    consented_at: "2026-08-08T00:00:00.000Z",
    expires_at: "2027-08-08T00:00:00.000Z",
    state_version: 1,
  }] });
  try {
    await createPostgresDomainLedger({ pool: fixture.appPool }).importSnapshot(
      createRecordRepositoryDomainSnapshot({
        descriptor: EMAIL_DMS_DOMAIN_DESCRIPTOR,
        repositories: [{ source_id: "outm26-postgres", repository }],
        tenant_id: TENANT,
      }).snapshot,
    );
  } finally { repository.close(); }
  await withPostgresTransaction(
    fixture.appPool,
    { tenant_id: TENANT },
    (client) => client.query(
      `INSERT INTO lawos_email_dms.conversation_policies
        (tenant_id,policy_id,user_id,entra_subject_id,m365_connection_id,
         mailbox_ref,conversation_id,matter_id,seed_email_thread_id,
         seed_filing_receipt_ref,enabling_actor_id,status,version,created_at,
         updated_at)
       VALUES ($1,'policy-outm26-postgres',$2,$3,$4,$5,
         'conversation-outm26-postgres','matter-outm26-postgres',
         'thread-outm26-postgres','receipt-outm26-postgres',$2,'active',1,$6,$6)`,
      [TENANT, USER, SUBJECT, CONNECTION, "a".repeat(64),
        "2026-08-08T00:00:00.000Z"],
    ),
  );
}

export function graphSubscriptionInput() {
  return {
    tenant_id: TENANT,
    user_id: USER,
    entra_subject_id: SUBJECT,
    actor_id: "graph-subscription-reconciler",
    m365_connection_id: CONNECTION,
  };
}
