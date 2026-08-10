import assert from "node:assert/strict";
import test from "node:test";
import { createMigratedPostgresFixture } from "../../persistence/test/helpers/disposable-postgres.js";
import { withPostgresTransaction } from "../../persistence/src/postgres/transaction.js";
import { createPostgresDmsUploadRuntime } from "../src/postgres-upload-runtime.js";
import { executeApprovedPrecedentImport } from "../src/search/precedent-import-command.js";
import { createLocalStorageAdapter } from "../src/storage/local-storage-adapter.js";
import { sha256Hex } from "../src/storage/storage-adapter.js";
import {
  ACTOR,
  TENANT,
  commitDocument,
  digest,
  extractor,
  index,
  repository,
  searchInput,
  source,
} from "./precedent-test-helpers.js";

test("current-version upload resets precedent privilege authority to unknown atomically", async (t) => {
  const fixture = await createMigratedPostgresFixture(t);
  if (!fixture) return;
  const storage = createLocalStorageAdapter({ adapter_id: "precedent-upload-reset" });
  const runtime = createPostgresDmsUploadRuntime({ pool: fixture.appPool, storage,
    clock: () => new Date("2026-08-08T05:00:00.000Z") });
  const repo = repository(fixture.appPool);
  const extraction = extractor(fixture.appPool, storage);
  const uploadVersion = async (versionNumber, body) => {
    const bytes = Buffer.from(body, "utf8");
    const versionId = `version-upload-${versionNumber}`;
    const sessionId = `session-upload-${versionNumber}`;
    await runtime.createUploadSession({ tenant_id: TENANT, session_id: sessionId,
      idempotency_key: `idempotency-upload-${versionNumber}`,
      matter_id: "matter-upload", workspace_id: "workspace-upload",
      document_id: "document-upload", version_id: versionId,
      version_number: versionNumber, object_id: `object-upload-${versionNumber}`,
      adapter_id: storage.adapter_id, title: "업로드 판례 문서", content_type: "text/plain",
      expected_sha256: sha256Hex(bytes), expected_byte_size: bytes.byteLength,
      permission_envelope_id: "permission-upload", audit_trace_id: "audit-upload",
      actor_id: ACTOR, expires_at: "2026-08-09T00:00:00.000Z" });
    await runtime.stageUpload({ tenant_id: TENANT, session_id: sessionId, bytes });
    await runtime.finalizeUpload({ tenant_id: TENANT, session_id: sessionId });
    return Object.freeze({ versionId, bytes });
  };
  const firstUpload = await uploadVersion(1, "손해 fiduciary first immutable version");
  const entry = source({ source_id: "source-upload", matter_id: "matter-upload",
    document_id: "document-upload", version_id: firstUpload.versionId,
    title: "업로드 판례 문서", body: firstUpload.bytes.toString("utf8") });
  await assert.rejects(repo.registerSource(entry),
    (error) => error.safe_error_code === "PRECEDENT_SOURCE_INELIGIBLE");
  await repo.classifyDocumentPrivilege({ tenant_id: TENANT, document_id: entry.document_id,
    label_id: "privilege:upload:v1", classification: "not_privileged",
    authority: "dms-privilege-review-v1", decision_id: "decision:upload:v1",
    provenance_sha256: digest("3"), applied_by: ACTOR,
    applied_at: "2026-08-08T05:01:00.000Z" });
  await repo.registerSource(entry);
  await index(repo, extraction, entry);
  assert.equal((await repo.readiness({ tenant_id: TENANT,
    allowed_document_ids: [entry.document_id] })).runtime_ready, true);

  await uploadVersion(2, "손해 fiduciary second immutable version");
  const state = await withPostgresTransaction(fixture.appPool,
    { tenant_id: TENANT, readOnly: true }, (client) => client.query(
      `SELECT current_version_id,privilege_status,current_privilege_label_id
         FROM lawos_dms.documents WHERE tenant_id=$1 AND document_id=$2`,
      [TENANT, entry.document_id]));
  assert.deepEqual(state.rows[0], { current_version_id: "version-upload-2",
    privilege_status: "unknown", current_privilege_label_id: null });
  assert.equal((await repo.readiness({ tenant_id: TENANT,
    allowed_document_ids: [entry.document_id] })).runtime_ready, false);
  assert.deepEqual((await repo.listSourceDescriptors({ tenant_id: TENANT }))
    .map(({ source_id }) => source_id), [entry.source_id]);
  assert.deepEqual((await repo.search(searchInput({ query: "손해 fiduciary",
    allowed_document_ids: [entry.document_id],
    request_occurrence_id: "request:upload-reset" }))).items, []);
});

test("disable, unapprove, and approved import/index are durable and replay-safe", async (t) => {
  const fixture = await createMigratedPostgresFixture(t);
  if (!fixture) return;
  const storage = createLocalStorageAdapter({ adapter_id: "precedent-import" });
  const repo = repository(fixture.appPool);
  const extraction = extractor(fixture.appPool, storage);
  const entries = ["disable", "unapprove"].map((action, indexValue) => source({
    source_id: `source-${action}`, matter_id: `matter-${action}`,
    document_id: `document-${action}`, version_id: `version-${action}-1`,
    title: `${action} source`, body: `${action} body ${indexValue}`,
    approval: `approval-${action}` }));
  for (const entry of entries) {
    await commitDocument(fixture.appPool, storage, entry);
    await repo.registerSource(entry);
    await index(repo, extraction, entry);
  }
  const disabled = await repo.disableSource({ tenant_id: TENANT,
    source_id: entries[0].source_id, actor_id: ACTOR, idempotency_key: "disable:1" });
  assert.equal(disabled.source.status, "disabled");
  assert.equal((await repo.disableSource({ tenant_id: TENANT,
    source_id: entries[0].source_id, actor_id: ACTOR,
    idempotency_key: "disable:1" })).replayed, true);
  const unapproved = await repo.unapproveSource({ tenant_id: TENANT,
    source_id: entries[1].source_id, actor_id: ACTOR, idempotency_key: "unapprove:1" });
  assert.equal(unapproved.source.status, "unapproved");

  const imported = source({ source_id: "source-import", matter_id: "matter-import",
    document_id: "document-import", version_id: "version-import-1",
    title: "승인 import", body: "검증된 원본 바이트" });
  await commitDocument(fixture.appPool, storage, imported);
  const manifest = { schema_version: "amic-os.precedent-import.v1", tenant_id: TENANT,
    batch_id: "batch-command-1", approval: { authority: "vault-approved-precedent-corpus-v1",
      approval_id: "approval-command-1", approval_decision_id: "decision-command-1",
      approved_by: ACTOR, approved_at: "2026-08-08T02:00:00.000Z" },
    sources: [{ source_id: imported.source_id, source_kind: imported.source_kind,
      matter_id: imported.matter_id, document_id: imported.document_id,
      version_id: imported.version_id, content_sha256: imported.content_sha256,
      title: imported.title }] };
  const first = await executeApprovedPrecedentImport({ repository: repo,
    extractor: extraction, manifest, actor_id: ACTOR });
  const replay = await executeApprovedPrecedentImport({ repository: repo,
    extractor: extraction, manifest, actor_id: ACTOR });
  assert.equal(first.imported_count, 1);
  assert.equal(replay.results[0].replayed, true);
  assert.equal(JSON.stringify(first).includes("검증된 원본 바이트"), false);
  await assert.rejects(fixture.adminPool.query(
    "DELETE FROM lawos_dms.precedent_sources WHERE tenant_id=$1 AND source_id=$2",
    [TENANT, imported.source_id]), (error) => error.code === "55000");
  await assert.rejects(fixture.adminPool.query(
    "UPDATE lawos_dms.precedent_extraction_receipts SET issued_by='tampered' WHERE tenant_id=$1 AND source_id=$2",
    [TENANT, imported.source_id]), (error) => error.code === "55000");
  await assert.rejects(executeApprovedPrecedentImport({ repository: repo,
    extractor: extraction,
    manifest: { ...manifest, approval: { ...manifest.approval, authority: "client-asserted" } },
    actor_id: ACTOR }), /approval authority/u);
  await assert.rejects(executeApprovedPrecedentImport({ repository: repo,
    extractor: extraction, manifest: { ...manifest,
      sources: [{ ...manifest.sources[0], body_text: "client substituted" }] },
    actor_id: ACTOR }), /server-derived only/u);
});
