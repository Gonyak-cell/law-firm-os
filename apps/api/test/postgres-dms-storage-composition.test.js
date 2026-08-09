import assert from "node:assert/strict";
import test from "node:test";
import {
  inquiryEmailEvidenceId,
  inquiryEvidenceFileObjectId,
  normalizeInquiryEmailEvidence,
  normalizeInquiryEvidenceFileObject,
} from "../../../packages/email-dms/src/inquiry-evidence-model.js";
import { createPostgresDmsUploadRuntime } from "../../../packages/dms/src/postgres-upload-runtime.js";
import {
  createPostgresDmsConsumerReadAuthority,
  createPostgresDmsConsumerStorage,
} from "../../../packages/dms/src/postgres-consumer-storage.js";
import { createLocalStorageAdapter } from "../../../packages/dms/src/storage/local-storage-adapter.js";
import { createHrxDomainSnapshot } from "../../../packages/hrx/src/postgres-store-v2.js";
import { runHrxMigrations } from "../../../packages/hrx/src/migrations/index.js";
import { createFileHrxStore } from "../../../packages/hrx/src/store/file-store.js";
import { createPostgresDomainLedger } from "../../../packages/persistence/src/postgres/domain-ledger.js";
import { createMigratedPostgresFixture } from "../../../packages/persistence/test/helpers/disposable-postgres.js";
import { createBankImportPreviewTokenAuthority } from "../src/bank-import-preview-token.js";
import { createPostgresApiRuntimeAuthority } from "../src/postgres-api-runtime-authority.js";

const TENANT = "tenant_postgres_dms_storage_composition";
const NOW = "2026-08-09T05:00:00.000Z";
function countedStorage(adapterId) {
  const base = createLocalStorageAdapter({ adapter_id: adapterId });
  const calls = { get: 0, put: 0 };
  return Object.freeze({
    base,
    calls,
    storage: Object.freeze({
      ...base,
      getObject(input) { calls.get += 1; return base.getObject(input); },
      putObject(input) { calls.put += 1; return base.putObject(input); },
    }),
  });
}
async function importHrxBaseline(ledger) {
  const store = createFileHrxStore();
  try {
    runHrxMigrations(store);
    await ledger.importSnapshot(createHrxDomainSnapshot({
      store,
      tenant_id: TENANT,
    }).snapshot);
  } finally {
    store.close();
  }
}

function inquiryRecords(storage) {
  const mailbox = "intake@example.test";
  const graphId = "graph-immutable-storage-composition";
  const evidenceId = inquiryEmailEvidenceId({
    tenant_id: TENANT,
    mailbox_address: mailbox,
    graph_immutable_message_id: graphId,
  });
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
  const originalBytes = Buffer.from("From: sender@example.test\r\n\r\nInquiry original");
  const displayBytes = Buffer.from("Sanitized inquiry display");
  const original = storage.putObject({ tenant_id: TENANT, object_id: originalId, bytes: originalBytes, content_type: "message/rfc822" });
  const display = storage.putObject({ tenant_id: TENANT, object_id: displayId, bytes: displayBytes, content_type: "text/plain; charset=utf-8" });
  const common = {
    tenant_id: TENANT,
    inquiry_email_evidence_id: evidenceId,
    retention_policy_id: "retention-inquiry",
    legal_hold_state: "none",
    kms_key_ref: "kms:test:inquiry",
    created_by: "actor-inquiry",
    created_at: NOW,
  };
  return Object.freeze({
    evidenceId,
    displayBytes,
    evidence: normalizeInquiryEmailEvidence({
      model_type: "InquiryEmailEvidence",
      inquiry_email_evidence_id: evidenceId,
      tenant_id: TENANT,
      mailbox_address: mailbox,
      graph_immutable_message_id: graphId,
      internet_message_id: null,
      conversation_id: "conversation-storage-composition",
      mime_file_object_id: originalId,
      mime_sha256: original.sha256,
      mime_byte_size: original.byte_size,
      subject: "Storage composition inquiry",
      sender: { address: "sender@example.test" },
      recipients: [{ address: mailbox, recipient_type: "to" }],
      received_at: NOW,
      display_file_object_id: displayId,
      attachment_manifest: [],
      capture_status: "pending_link",
      retention_policy_ref: "retention:inquiry",
      legal_hold_state: "none",
      captured_by: "actor-inquiry",
      captured_at: NOW,
    }),
    original: normalizeInquiryEvidenceFileObject({
      ...common,
      model_type: "InquiryEvidenceFileObject",
      inquiry_evidence_file_object_id: originalId,
      object_kind: "original_mime",
      storage_pointer_ref: original.storage_pointer_ref,
      sha256: original.sha256,
      byte_size: original.byte_size,
      mime_type: "message/rfc822",
      scan_status: "clean",
    }),
    display: normalizeInquiryEvidenceFileObject({
      ...common,
      model_type: "InquiryEvidenceFileObject",
      inquiry_evidence_file_object_id: displayId,
      object_kind: "sanitized_display",
      storage_pointer_ref: display.storage_pointer_ref,
      sha256: display.sha256,
      byte_size: display.byte_size,
      mime_type: "text/plain; charset=utf-8",
      scan_status: "clean",
    }),
  });
}

test("PostgreSQL API keeps DMS strict while payroll and inquiry use explicit domain storage", async (t) => {
  const postgres = await createMigratedPostgresFixture(t);
  if (!postgres) return;
  const ledger = createPostgresDomainLedger({ pool: postgres.appPool });
  await importHrxBaseline(ledger);
  const dms = countedStorage("dms-strict-composition");
  const payroll = countedStorage("payroll-domain-composition");
  const inquiry = countedStorage("inquiry-domain-composition");
  const records = inquiryRecords(inquiry.storage);
  dms.base.putObject({ tenant_id: TENANT, object_id: "untracked-dms-object", bytes: Buffer.from("must stay hidden") });
  const consumerAuthority = createPostgresDmsConsumerReadAuthority({ pool: postgres.appPool });
  await consumerAuthority.probe({ tenant_id: TENANT, adapter_id: dms.storage.adapter_id });
  const guarded = createPostgresDmsConsumerStorage({ storage: dms.storage, authority: consumerAuthority });
  const authority = createPostgresApiRuntimeAuthority({
    ledger,
    dmsStorage: guarded,
    payrollArtifactStorage: payroll.storage,
    inquiryEvidenceStorage: inquiry.storage,
    dmsUploadRuntime: createPostgresDmsUploadRuntime({
      pool: postgres.appPool,
      storage: dms.storage,
      committedStorage: guarded,
      completionDenyAuthority: consumerAuthority,
      sourceOnly: false,
    }),
    payrollArtifactSecret: "postgres-storage-composition-payroll-secret",
    bankImportPreviewTokens: createBankImportPreviewTokenAuthority({
      secret: "postgres-storage-composition-bank-preview-secret",
    }),
    requireDmsConsumerReadAuthority: true,
  });

  await authority.run({
    tenant_id: TENANT,
    command: async (runtimes) => {
      assert.equal(runtimes.dmsRuntime.storage, guarded);
      assert.equal(runtimes.emailDmsRuntime.storage, guarded);
      await assert.rejects(
        runtimes.dmsRuntime.storage.getObject({ tenant_id: TENANT, object_id: "untracked-dms-object" }),
        (error) => error?.safe_error_code === "DMS_COMMITTED_OBJECT_NOT_AUTHORIZED",
      );
      assert.equal(dms.calls.get, 0);

      const payrollBytes = Buffer.from("tenant-authorized payroll artifact");
      await runtimes.hrxRuntime.payrollRuntime.artifactVault.put({
        tenant_id: TENANT,
        object_id: "payroll/domain-artifact",
        bytes: payrollBytes,
        content_type: "application/pdf",
      });
      assert.equal((await runtimes.hrxRuntime.payrollRuntime.artifactVault.get({
        tenant_id: TENANT,
        object_id: "payroll/domain-artifact",
      })).equals(payrollBytes), true);

      runtimes.emailDmsRuntime.repository.transaction((tx) => {
        tx.create(records.evidence);
        tx.create(records.original);
        tx.create(records.display);
        tx.recordIdempotency({
          tenant_id: TENANT,
          idempotency_key: "capture-inquiry-storage-composition",
          operation: "capture_inquiry_email_evidence",
          response: { inquiry_email_evidence_id: records.evidenceId },
        });
      });
      const content = await runtimes.emailDmsRuntime.evidence_storage_service.readEvidenceContent({
        tenant_id: TENANT,
        inquiry_email_evidence_id: records.evidenceId,
        object_kind: "sanitized_display",
        actor_id: "actor-inquiry",
        request_id: "request-inquiry-storage-composition",
      });
      assert.equal(content.bytes.equals(records.displayBytes), true);

    },
  });
  assert.deepEqual(payroll.calls, { get: 1, put: 1 });
  assert.deepEqual(inquiry.calls, { get: 1, put: 2 });
  assert.deepEqual(dms.calls, { get: 0, put: 0 });
});
