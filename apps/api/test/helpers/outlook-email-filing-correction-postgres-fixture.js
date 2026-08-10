import { createHash } from "node:crypto";
import { fileEmailThreadToMatter } from "../../../../packages/email-dms/src/email-filing-service.js";
import {
  DMS_AUXILIARY_DOMAIN_DESCRIPTOR,
  createDmsAuxiliaryRepository,
} from "../../../../packages/dms/src/central-ledger.js";
import { createPostgresDmsUploadRuntime } from "../../../../packages/dms/src/postgres-upload-runtime.js";
import { createLocalStorageAdapter } from "../../../../packages/dms/src/storage/local-storage-adapter.js";
import { runHrxMigrations } from "../../../../packages/hrx/src/migrations/index.js";
import { createHrxDomainSnapshot } from "../../../../packages/hrx/src/postgres-store-v2.js";
import { createFileHrxStore } from "../../../../packages/hrx/src/store/file-store.js";
import { MATTER_DOMAIN_DESCRIPTOR } from "../../../../packages/matter/src/central-ledger.js";
import { createMatterRepository } from "../../../../packages/matter/src/repository.js";
import { createPostgresDomainLedger } from "../../../../packages/persistence/src/postgres/domain-ledger.js";
import { createRecordRepositoryDomainSnapshot } from "../../../../packages/persistence/src/record-domain-adapter.js";
import { createMigratedPostgresFixture } from "../../../../packages/persistence/test/helpers/disposable-postgres.js";
import { createBankImportPreviewTokenAuthority } from "../../src/bank-import-preview-token.js";
import { handleOutlookAddinApiRequest } from "../../src/outlook-addin-runtime-context.js";
import { createPostgresApiRuntimeAuthority } from "../../src/postgres-api-runtime-authority.js";

export const PG_TENANT = "tenant-outm21-production-authority";
export const PG_OTHER_TENANT = "tenant-outm21-production-authority-other";
export const PG_MATTER_A = "matter-outm21-pg-a";
export const PG_MATTER_B = "matter-outm21-pg-b";
export const PG_THREAD = "email-thread-outm21-pg";
export const PG_GRAPH_ID = "immutable:outm21-pg-original";
export const PG_INTERNET_ID = "<outm21-pg@example.test>";
export const PG_CONVERSATION_ID = "conversation-outm21-pg-original";
export const PG_RECEIPT = `outlook.email.file:${PG_TENANT}:${PG_THREAD}`;
export const PG_ORIGINAL_ACTOR = "user-outm21-pg-original";
export const PG_CORRECTION_ACTOR = "user-outm21-pg-corrector";
export const PG_ORIGINAL_AT = "2026-08-08T01:00:00.000Z";
export const PG_MIME_BYTES = Buffer.from(
  "From: filer@example.test\r\nSubject: OUTM-21 PostgreSQL\r\n"
  + `Message-ID: ${PG_INTERNET_ID}\r\nContent-Type: text/plain\r\n\r\noriginal`,
);
export const PG_MIME_SHA256 = createHash("sha256").update(PG_MIME_BYTES).digest("hex");
export const PG_DOCUMENT = `doc:${PG_THREAD}:original-mime:${PG_MIME_SHA256}`;
export const PG_VERSION = `version:${PG_DOCUMENT}:1`;
export const PG_FILE_OBJECT = `file:${PG_VERSION}`;

const PAYROLL_SECRET = "outm21-postgres-production-authority-payroll-secret";
const STORAGE_OBJECT = "object-outm21-pg-original-1";
const BANK_TOKENS = createBankImportPreviewTokenAuthority({
  secret: "outm21-postgres-production-authority-bank-token-secret",
});

async function importHrxBaseline(ledger, tenantId) {
  const store = createFileHrxStore();
  try {
    runHrxMigrations(store);
    await ledger.importSnapshot(createHrxDomainSnapshot({
      store,
      tenant_id: tenantId,
    }).snapshot);
  } finally {
    store.close();
  }
}

async function importRepository(ledger, descriptor, repository, tenantId, sourceId) {
  try {
    const result = createRecordRepositoryDomainSnapshot({
      descriptor,
      repositories: [{ source_id: sourceId, repository }],
      tenant_id: tenantId,
    });
    await ledger.importSnapshot(result.snapshot);
  } finally {
    repository.close();
  }
}

function matterSeed() {
  const createdAt = "2026-08-08T00:00:00.000Z";
  return [PG_MATTER_A, PG_MATTER_B].map((matterId) => ({
    model_type: "Matter",
    tenant_id: PG_TENANT,
    matter_id: matterId,
    matter_code: `OUTM21-PG/${matterId}`,
    client_id: "client-outm21-pg",
    title: matterId,
    status: "open",
    created_by: PG_CORRECTION_ACTOR,
    created_at: createdAt,
    permission_envelope_id: `perm:${matterId}`,
    audit_trace_id: `audit:${matterId}`,
  }));
}

async function threadRepository(uploadRuntime) {
  const repository = createDmsAuxiliaryRepository();
  const result = await fileEmailThreadToMatter({
    repository,
    thread: {
      tenant_id: PG_TENANT,
      matter_id: PG_MATTER_A,
      email_thread_id: PG_THREAD,
      graph_message_id: PG_GRAPH_ID,
      internet_message_id: PG_INTERNET_ID,
      conversation_id: PG_CONVERSATION_ID,
      subject: "OUTM-21 PostgreSQL original",
      status: "draft",
      permission_envelope_id: `perm:${PG_MATTER_A}`,
      audit_trace_id: "audit:outm21-pg-thread",
      filing_user: PG_ORIGINAL_ACTOR,
      filing_time: PG_ORIGINAL_AT,
      filing_mode: "manual",
      filed_document_ids: [PG_DOCUMENT],
    },
    actor_id: PG_ORIGINAL_ACTOR,
    require_original_mime_document: true,
    idempotency_key: `outlook-email-file:${PG_THREAD}:${PG_MIME_SHA256}:dms`,
    durable_mime_authority: uploadRuntime,
    audit: { append(event, writer = repository) {
      return writer.appendAudit({
        ...event,
        event_id: PG_RECEIPT,
        occurred_at: PG_ORIGINAL_AT,
        metadata: {
          raw_provider_payload_included: false,
          credential_material_included: false,
        },
      });
    } },
  });
  if (result.outcome !== "created" || result.thread.status !== "active") {
    throw new Error("OUTM-21 PostgreSQL filing fixture did not finalize");
  }
  return repository;
}

export function correctionContext(tenantId = PG_TENANT, actorId = PG_CORRECTION_ACTOR) {
  return Object.freeze({
    principal: Object.freeze({ tenant_id: tenantId, user_id: actorId, actor_id: actorId }),
    rules: Object.freeze([{ id: "outm21-pg-allow", effect: "allow", action: "*" }]),
    object_acl: Object.freeze([]),
  });
}

export async function createPostgresCorrectionFixture(t) {
  const database = await createMigratedPostgresFixture(t, { appPoolMax: 16 });
  if (!database) return null;
  const ledger = createPostgresDomainLedger({ pool: database.appPool });
  const storage = createLocalStorageAdapter({ adapter_id: "outm21-pg-production-authority" });
  const uploadRuntime = createPostgresDmsUploadRuntime({
    pool: database.appPool,
    storage,
    sourceOnly: false,
    clock: () => new Date(PG_ORIGINAL_AT),
  });
  const uploaded = await uploadRuntime.uploadDocument({
    document: {
      tenant_id: PG_TENANT,
      matter_id: PG_MATTER_A,
      workspace_id: `workspace:${PG_MATTER_A}`,
      document_id: PG_DOCUMENT,
      current_version_id: PG_VERSION,
      title: "OUTM-21 PostgreSQL original.eml",
      status: "active",
      permission_envelope_id: `perm:${PG_MATTER_A}`,
      audit_trace_id: "audit:outm21-pg-document",
      mime_type: "message/rfc822",
      source_email_thread_id: PG_THREAD,
    },
    bytes: PG_MIME_BYTES,
    actor_id: PG_ORIGINAL_ACTOR,
    idempotency_key: "outm21-pg-specialized-upload",
    object_id: STORAGE_OBJECT,
  });
  await importRepository(
    ledger,
    MATTER_DOMAIN_DESCRIPTOR,
    createMatterRepository({ seedRecords: matterSeed() }),
    PG_TENANT,
    "matter",
  );
  await importRepository(
    ledger,
    DMS_AUXILIARY_DOMAIN_DESCRIPTOR,
    await threadRepository(uploadRuntime),
    PG_TENANT,
    "dms",
  );
  await importHrxBaseline(ledger, PG_TENANT);
  await importHrxBaseline(ledger, PG_OTHER_TENANT);
  const authority = () => createPostgresApiRuntimeAuthority({
    ledger,
    dmsStorage: storage,
    dmsUploadRuntime: uploadRuntime,
    payrollArtifactSecret: PAYROLL_SECRET,
    bankImportPreviewTokens: BANK_TOKENS,
  });
  return Object.freeze({ database, ledger, storage, uploadRuntime, uploaded, authority });
}

export function runCorrectionRequest(fixture, {
  authority = fixture.authority(),
  tenantId = PG_TENANT,
  context = correctionContext(tenantId),
  method,
  pathname,
  query = {},
  body = {},
  requestId,
  runtimeTransform = (runtimes) => runtimes,
}) {
  return authority.run({
    tenant_id: tenantId,
    request_context: {
      method,
      pathname,
      actor_id: context.principal.user_id,
      idempotency_key: body.idempotency_key,
    },
    command: (runtimes) => handleOutlookAddinApiRequest({
      pathname,
      method,
      query,
      body,
      context,
      requestId,
      runtime: runtimeTransform(runtimes),
    }),
  });
}
