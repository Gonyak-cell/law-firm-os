import assert from "node:assert/strict";
import test from "node:test";
import {
  inquiryEmailEvidenceId,
  inquiryEvidenceFileObjectId,
} from "../src/inquiry-evidence-model.js";
import { EMAIL_DMS_DOMAIN_DESCRIPTOR } from "../src/central-ledger.js";
import { createEmailDmsRepository } from "../src/repository.js";
import {
  runRecordRepositoryDomainCommand,
} from "../../persistence/src/record-domain-adapter.js";
import {
  createPostgresDomainLedger,
} from "../../persistence/src/postgres/domain-ledger.js";
import {
  createMigratedPostgresFixture,
} from "../../persistence/test/helpers/disposable-postgres.js";
import {
  M365_GRAPH_REQUIRED_SCOPES,
} from "../src/m365-connection-model.js";
import {
  createM365GraphConnectionService,
} from "../src/m365-graph-connection-service.js";

const TENANT = "tenant_email_dms_authority";
const CAPTURED_AT = "2026-07-30T07:30:00.000Z";

function records() {
  const base = {
    tenant_id: TENANT,
    mailbox_address: "authority@example.invalid",
    internet_message_id: "<authority-001@example.invalid>",
    graph_immutable_message_id: "immutable-authority-001",
  };
  const evidenceId = inquiryEmailEvidenceId(base);
  const originalId = inquiryEvidenceFileObjectId({
    tenant_id: TENANT,
    inquiry_email_evidence_id: evidenceId,
    object_kind: "original_mime",
  });
  const displayId = inquiryEvidenceFileObjectId({
    tenant_id: TENANT,
    inquiry_email_evidence_id: evidenceId,
    object_kind: "sanitized_display",
  });
  const commonFile = {
    model_type: "InquiryEvidenceFileObject",
    tenant_id: TENANT,
    inquiry_email_evidence_id: evidenceId,
    scan_status: "clean",
    retention_policy_id: "retention-email-authority",
    legal_hold_state: "none",
    kms_key_ref: "kms-key-ref:email-authority",
    created_by: "user_email_authority",
    created_at: CAPTURED_AT,
  };
  return [{
    ...commonFile,
    inquiry_evidence_file_object_id: originalId,
    object_kind: "original_mime",
    storage_pointer_ref: "vault://email-authority/original-001",
    sha256: "c".repeat(64),
    byte_size: 900,
    mime_type: "message/rfc822",
  }, {
    ...commonFile,
    inquiry_evidence_file_object_id: displayId,
    object_kind: "sanitized_display",
    storage_pointer_ref: "vault://email-authority/display-001",
    sha256: "d".repeat(64),
    byte_size: 240,
    mime_type: "text/html; charset=utf-8",
  }, {
    model_type: "InquiryEmailEvidence",
    inquiry_email_evidence_id: evidenceId,
    ...base,
    lead_id: "lead_email_authority",
    conversation_id: "conversation-email-authority",
    mime_file_object_id: originalId,
    mime_sha256: "c".repeat(64),
    mime_byte_size: 900,
    subject: "Synthetic authority inquiry",
    sender: { address: "sender@example.invalid" },
    recipients: [{ address: "authority@example.invalid", type: "to" }],
    received_at: "2026-07-30T07:25:00.000Z",
    display_file_object_id: displayId,
    attachment_manifest: [],
    capture_status: "complete",
    retention_policy_ref: "retention-email-authority",
    legal_hold_state: "none",
    captured_by: "user_email_authority",
    captured_at: CAPTURED_AT,
  }];
}

test("CL-P3-W01-T01 Email DMS PostgreSQL runtime authority는 증거·파일·멱등성·감사를 한 domain으로 readback한다", async (t) => {
  const fixture = await createMigratedPostgresFixture(t);
  if (!fixture) return;
  const ledger = createPostgresDomainLedger({ pool: fixture.appPool });
  const sourceRecords = records();
  const result = await runRecordRepositoryDomainCommand({
    ledger,
    descriptor: EMAIL_DMS_DOMAIN_DESCRIPTOR,
    tenant_id: TENANT,
    create_repository: createEmailDmsRepository,
    command(repository) {
      repository.transaction((tx) => {
        for (const record of sourceRecords) tx.create(record);
        tx.recordIdempotency({
          tenant_id: TENANT,
          idempotency_key: "email-authority-capture-001",
          operation: "capture_inquiry_email_evidence",
          response: {
            inquiry_email_evidence_id:
              sourceRecords[2].inquiry_email_evidence_id,
          },
          created_at: CAPTURED_AT,
        });
        tx.appendAudit({
          tenant_id: TENANT,
          event_id: "audit-email-authority-capture-001",
          event_type: "inquiry.email_evidence.registered",
          actor_id: "user_email_authority",
          object_type: "InquiryEmailEvidence",
          object_id: sourceRecords[2].inquiry_email_evidence_id,
          payload: {
            mime_sha256: sourceRecords[2].mime_sha256,
            raw_content_included: false,
          },
          created_at: CAPTURED_AT,
        });
      });
      return { created_count: sourceRecords.length };
    },
  });
  assert.equal(result.result.created_count, 3);
  assert.equal(result.flush.comparison.equal, true);

  const persisted = await ledger.list({
    tenant_id: TENANT,
    domain_id: "email-dms",
  });
  assert.equal(persisted.length, 3);
  assert.equal(
    persisted.filter(
      (record) => record.record_type === "InquiryEvidenceFileObject",
    ).length,
    2,
  );
  const evidence = persisted.find(
    (record) => record.record_type === "InquiryEmailEvidence",
  );
  assert.equal(evidence.payload.mime_sha256, "c".repeat(64));
  assert.equal(JSON.stringify(persisted).includes("mime_bytes"), false);
  assert.equal(JSON.stringify(persisted).includes("body_html"), false);
  const idempotency = await ledger.listIdempotency({
    tenant_id: TENANT,
    domain_id: "email-dms",
  });
  const audit = await ledger.listAudit({
    tenant_id: TENANT,
    domain_id: "email-dms",
  });
  assert.equal(idempotency.length, 1);
  assert.equal(audit.length, 1);

  const credentials = new Map();
  let providerCompletionCount = 0;
  const graphDependencies = {
    credential_vault: {
      async storeDelegatedCredential({ token_bundle, credential_ref }) {
        const reference = credential_ref
          ?? "aws-secrets-manager:synthetic/email-dms-authority";
        credentials.set(reference, structuredClone(token_bundle));
        return reference;
      },
      async resolveDelegatedCredential({ credential_ref }) {
        return structuredClone(credentials.get(credential_ref));
      },
      async deleteDelegatedCredential({ credential_ref }) {
        credentials.delete(credential_ref);
      },
    },
    provider: {
      async completeDelegatedAuthorization() {
        providerCompletionCount += 1;
        return {
          authorization_attempt_consumed: true,
          entra_subject_id: "entra-subject-email-authority",
          mailbox_address: "authority@example.invalid",
          granted_scopes: [...M365_GRAPH_REQUIRED_SCOPES],
          consented_at: CAPTURED_AT,
          expires_at: "2026-08-30T07:30:00.000Z",
          token_bundle: {
            access_token: "authority-access-token-never-persist",
            refresh_token: "authority-refresh-token-never-persist",
          },
        };
      },
    },
  };
  const connect = () => runRecordRepositoryDomainCommand({
    ledger,
    descriptor: EMAIL_DMS_DOMAIN_DESCRIPTOR,
    tenant_id: TENANT,
    create_repository: createEmailDmsRepository,
    command(repository) {
      const service = createM365GraphConnectionService({
        repository,
        ...graphDependencies,
        feature_enabled: true,
        provider_runtime_enabled: true,
        allowed_redirect_uris: [
          "https://app.example.invalid/api/outlook/connection/callback",
        ],
        clock: () => new Date(CAPTURED_AT),
      });
      return service.completeAuthorization({
        tenant_id: TENANT,
        user_id: "user_email_authority",
        entra_subject_id: "entra-subject-email-authority",
        code: "synthetic-single-use-code",
        state: "synthetic-single-use-state",
        redirect_uri:
          "https://app.example.invalid/api/outlook/connection/callback",
      });
    },
  });
  const connected = await connect();
  assert.equal(connected.result.connection.status, "connected");
  assert.equal(connected.flush.comparison.equal, true);
  const replayed = await connect();
  assert.equal(replayed.result.replayed, true);
  assert.equal(providerCompletionCount, 1);
  const m365 = await ledger.list({
    tenant_id: TENANT,
    domain_id: "email-dms",
    record_type: "M365Connection",
  });
  assert.equal(m365.length, 1);
  assert.equal(
    JSON.stringify(m365).includes("authority-access-token"),
    false,
  );
  assert.equal(
    JSON.stringify(m365).includes("authority-refresh-token"),
    false,
  );
});
