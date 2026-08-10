import assert from "node:assert/strict";
import test from "node:test";
import { createMigratedPostgresFixture } from "../../persistence/test/helpers/disposable-postgres.js";
import { listPostgresFoundationMigrations } from "../../persistence/src/postgres/migration-catalog.js";
import { runPostgresMigrations } from "../../persistence/src/postgres/migration-runner.js";
import { withPostgresTransaction } from "../../persistence/src/postgres/transaction.js";
import { createPostgresDmsUploadRuntime } from "../src/postgres-upload-runtime.js";
import { createLocalStorageAdapter } from "../src/storage/local-storage-adapter.js";

const TENANT = "tenant-outlook-source-pg";
const MATTER = "matter-outlook-source-pg";
const THREAD = "thread-outlook-source-pg";
const ATTACHMENT = "attachment-outlook-source-pg";
const BYTES = Buffer.from("authoritative Outlook attachment bytes");
const NOW = "2026-08-08T02:00:00.000Z";

function document(overrides = {}) {
  const documentId = overrides.document_id ?? "document-outlook-source-pg";
  return {
    tenant_id: TENANT,
    matter_id: MATTER,
    workspace_id: `workspace:${MATTER}`,
    document_id: documentId,
    current_version_id: `version:${documentId}:1`,
    title: `${documentId}.bin`,
    mime_type: "application/octet-stream",
    permission_envelope_id: "permission-outlook-source-pg",
    audit_trace_id: "audit-outlook-source-pg",
    ...overrides,
  };
}

async function upload(runtime, value, idempotencyKey) {
  return runtime.uploadDocument({
    document: value,
    bytes: BYTES,
    actor_id: "outlook-source-pg-test",
    idempotency_key: idempotencyKey,
  });
}

test("OUTM-18 PostgreSQL source identity survives fresh migration, runtime restart, and replay", async (t) => {
  const fixture = await createMigratedPostgresFixture(t);
  if (!fixture) return;
  const migrations = listPostgresFoundationMigrations();
  const sourceIdentityMigration = migrations.find(
    ({ id }) => id === "012_outlook_document_source_identity",
  );
  assert.match(sourceIdentityMigration?.checksum ?? "", /^[a-f0-9]{64}$/u);
  const restart = await runPostgresMigrations(fixture.adminPool, { appliedBy: "outlook-source-restart" });
  assert.equal(restart.every((entry) => entry.applied === false), true);

  const storage = createLocalStorageAdapter({ adapter_id: "outlook-source-pg" });
  const runtimeA = createPostgresDmsUploadRuntime({
    pool: fixture.appPool,
    storage,
    clock: () => new Date(NOW),
  });
  const attachmentDocument = document({
    source_email_thread_id: THREAD,
    source_attachment_id: ATTACHMENT,
  });
  const created = await upload(runtimeA, attachmentDocument, "outlook-source-attachment");
  assert.equal(created.outcome, "created");
  assert.equal(created.document.source_email_thread_id, THREAD);
  assert.equal(created.document.source_attachment_id, ATTACHMENT);

  const runtimeB = createPostgresDmsUploadRuntime({
    pool: fixture.appPool,
    storage,
    clock: () => new Date(NOW),
  });
  const replay = await upload(runtimeB, attachmentDocument, "outlook-source-attachment");
  assert.equal(replay.outcome, "idempotent_replay");
  const state = await runtimeB.getDocumentState({ tenant_id: TENANT, document_id: attachmentDocument.document_id });
  assert.equal(state.document.source_email_thread_id, THREAD);
  assert.equal(state.document.source_attachment_id, ATTACHMENT);
  const listed = await runtimeB.listDocuments({ tenant_id: TENANT, matter_id: MATTER });
  const listedAttachment = listed.find(
    (entry) => entry.document.document_id === attachmentDocument.document_id,
  );
  assert.equal(listedAttachment?.document.source_email_thread_id, THREAD);
  assert.equal(listedAttachment?.document.source_attachment_id, ATTACHMENT);

  const mime = await upload(runtimeB, document({
    document_id: "document-outlook-mime-pg",
    mime_type: "message/rfc822",
    source_email_thread_id: THREAD,
  }), "outlook-source-mime");
  assert.equal(mime.document.source_email_thread_id, THREAD);
  assert.equal(mime.document.source_attachment_id, null);
  const ordinary = await upload(runtimeB, document({ document_id: "document-ordinary-pg" }), "ordinary-source-null");
  assert.equal(ordinary.document.source_email_thread_id, null);
  assert.equal(ordinary.document.source_attachment_id, null);
});

test("OUTM-18 PostgreSQL source identity rejects changed hashes, malformed input, and SQL tamper", async (t) => {
  const fixture = await createMigratedPostgresFixture(t);
  if (!fixture) return;
  const storage = createLocalStorageAdapter({ adapter_id: "outlook-source-pg-tamper" });
  const runtime = createPostgresDmsUploadRuntime({ pool: fixture.appPool, storage, clock: () => new Date(NOW) });
  const attachmentDocument = document({
    source_email_thread_id: THREAD,
    source_attachment_id: ATTACHMENT,
  });
  await upload(runtime, attachmentDocument, "outlook-source-tamper");
  await assert.rejects(
    upload(runtime, { ...attachmentDocument, source_attachment_id: `${ATTACHMENT}-changed` }, "outlook-source-tamper"),
    (error) => error?.safe_error_code === "DMS_IDEMPOTENCY_CONFLICT",
  );
  await assert.rejects(
    upload(runtime, document({ document_id: "attachment-without-thread", source_attachment_id: ATTACHMENT }), "attachment-without-thread"),
    /source_email_thread_id is required/u,
  );
  await assert.rejects(
    upload(runtime, document({ document_id: "non-mime-without-attachment", source_email_thread_id: THREAD }), "non-mime-without-attachment"),
    /source_attachment_id is required for non-MIME/u,
  );
  await assert.rejects(
    upload(runtime, document({ document_id: "padded-source", source_email_thread_id: ` ${THREAD}` }), "padded-source"),
    /exact canonical source identifier/u,
  );
  await assert.rejects(
    withPostgresTransaction(fixture.appPool, { tenant_id: TENANT }, (client) => client.query(
      `INSERT INTO lawos_dms.upload_sessions
         (tenant_id, session_id, idempotency_key, request_hash, matter_id, workspace_id,
          document_id, version_id, version_number, object_id, adapter_id, title, content_type,
          expected_sha256, expected_byte_size, permission_envelope_id, audit_trace_id, actor_id,
          source_email_thread_id, source_attachment_id, state, expires_at, next_attempt_at,
          created_at, updated_at)
       SELECT tenant_id, session_id || ':orphan', idempotency_key || ':orphan', request_hash,
              matter_id, workspace_id, document_id || ':orphan', version_id || ':orphan',
              version_number, object_id || ':orphan', adapter_id, title, content_type,
              expected_sha256, expected_byte_size, permission_envelope_id, audit_trace_id,
              actor_id, NULL, $3, 'pending', expires_at, next_attempt_at, created_at, updated_at
         FROM lawos_dms.upload_sessions
        WHERE tenant_id = $1 AND document_id = $2`,
      [TENANT, attachmentDocument.document_id, ATTACHMENT],
    )),
    (error) => error?.postgres_code === "23514",
  );

  for (const table of ["upload_sessions", "documents"]) {
    await assert.rejects(
      withPostgresTransaction(fixture.appPool, { tenant_id: TENANT }, (client) => client.query(
        `UPDATE lawos_dms.${table}
            SET source_attachment_id = $3
          WHERE tenant_id = $1 AND document_id = $2`,
        [TENANT, attachmentDocument.document_id, `${ATTACHMENT}-tampered`],
      )),
      (error) => error?.postgres_code === "55000",
    );
  }
  const state = await runtime.getDocumentState({ tenant_id: TENANT, document_id: attachmentDocument.document_id });
  assert.equal(state.document.source_email_thread_id, THREAD);
  assert.equal(state.document.source_attachment_id, ATTACHMENT);

  const ordinary = document({ document_id: "legacy-null-source-pg" });
  await upload(runtime, ordinary, "legacy-null-source-pg");
  await assert.rejects(
    withPostgresTransaction(fixture.appPool, { tenant_id: TENANT }, (client) => client.query(
      `UPDATE lawos_dms.documents
          SET source_email_thread_id = $3
        WHERE tenant_id = $1 AND document_id = $2`,
      [TENANT, ordinary.document_id, THREAD],
    )),
    (error) => error?.postgres_code === "55000",
  );
  const legacy = await runtime.getDocumentState({ tenant_id: TENANT, document_id: ordinary.document_id });
  assert.equal(legacy.document.source_email_thread_id, null);
  assert.equal(legacy.document.source_attachment_id, null);
});
