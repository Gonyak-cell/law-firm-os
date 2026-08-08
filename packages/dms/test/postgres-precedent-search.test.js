import assert from "node:assert/strict";
import test from "node:test";
import { randomUUID } from "node:crypto";
import { createMigratedPostgresFixture } from "../../persistence/test/helpers/disposable-postgres.js";
import { withPostgresTransaction } from "../../persistence/src/postgres/transaction.js";
import { listPostgresFoundationMigrations } from "../../persistence/src/postgres/migration-catalog.js";
import { executeApprovedPrecedentImport } from "../src/search/precedent-import-command.js";
import { createImmutablePrecedentExtractionAuthority } from "../src/search/precedent-immutable-extractor.js";
import { createDocumentPrivilegeRepository } from "../src/search/document-privilege-repository.js";
import { createLocalStorageAdapter } from "../src/storage/local-storage-adapter.js";
import { createPostgresDmsUploadRuntime } from "../src/postgres-upload-runtime.js";
import { sha256Hex } from "../src/storage/storage-adapter.js";
import {
  PRECEDENT_INDEX_VERSION,
  PRECEDENT_SEARCH_SQL,
  buildVaultDocumentNavigationHref,
  createPostgresPrecedentRepository,
  createPrecedentCursorAuthority,
  derivePrecedentAuthorityKeys,
} from "../src/search/postgres-precedent-repository.js";

const TENANT = "tenant_precedent_alpha";
const OTHER_TENANT = "tenant_precedent_beta";
const ACTOR = "user_precedent_editor";
const SECRET = "precedent-test-authority-secret-material-20260808";

function digest(character) { return character.repeat(64); }

async function commitDocument(pool, storage, { tenant_id = TENANT, matter_id, document_id,
  version_id, title, version_number = 1, fixture_bytes,
  privileged = false, privilege_unknown = false,
  legal_hold_status = "none" } = {}) {
  const bytes = Buffer.from(fixture_bytes);
  const sha256 = sha256Hex(bytes);
  const objectId = `object:${version_id}`;
  const receipt = await storage.putObject({ tenant_id, object_id: objectId,
    bytes, content_type: "text/plain" });
  await withPostgresTransaction(pool, { tenant_id }, async (client) => {
    const fileId = `file:${version_id}`;
    await client.query(`INSERT INTO lawos_dms.documents
      (tenant_id,document_id,matter_id,workspace_id,title,status,current_version_id,
       permission_envelope_id,audit_trace_id,legal_hold_status)
      VALUES ($1,$2,$3,$4,$5,'active',NULL,$6,$7,'none')
      ON CONFLICT (tenant_id,document_id) DO NOTHING`,
    [tenant_id, document_id, matter_id, `workspace:${matter_id}`, title,
      `permission:${document_id}`, `audit:${document_id}`]);
    await client.query(`INSERT INTO lawos_dms.file_objects
      (tenant_id,file_object_id,object_id,adapter_id,storage_pointer_ref,sha256,
       byte_size,content_type,status)
      VALUES ($1,$2,$3,$4,$5,$6,$7,'text/plain','committed')`,
    [tenant_id, fileId, objectId, storage.adapter_id, receipt.storage_pointer_ref,
      sha256, bytes.byteLength]);
    await client.query(`INSERT INTO lawos_dms.document_versions
      (tenant_id,version_id,document_id,version_number,file_object_id,sha256,created_by)
      VALUES ($1,$2,$3,$4,$5,$6,$7)`,
    [tenant_id, version_id, document_id, version_number, fileId, sha256, ACTOR]);
    await client.query(`UPDATE lawos_dms.documents SET current_version_id=$3,
      updated_at=clock_timestamp()
      WHERE tenant_id=$1 AND document_id=$2`,
    [tenant_id, document_id, version_id]);
  });
  if (!privilege_unknown) await createDocumentPrivilegeRepository({ pool })
    .classifyDocumentPrivilege({ tenant_id, document_id,
      label_id: `privilege:${version_id}:${privileged ? "protected" : "cleared"}`,
      classification: privileged ? "privileged" : "not_privileged",
      authority: "dms-privilege-review-v1", decision_id: `decision:${version_id}`,
      provenance_sha256: sha256Hex(Buffer.from(`privilege:${version_id}`)),
      applied_by: ACTOR, applied_at: "2026-08-08T00:00:00.000Z" });
  if (legal_hold_status === "active") await createPostgresDmsUploadRuntime({
    pool, storage, clock: () => new Date("2026-08-08T00:00:00.000Z") })
    .placeLegalHold({ tenant_id, legal_hold_id: `hold:${version_id}`,
      document_id, object_id: objectId, created_by: ACTOR, reason: "precedent test hold" });
  return Object.freeze({ sha256, bytes });
}

function source({ tenant_id = TENANT, source_id, matter_id, document_id,
  version_id, title, body = `immutable source ${source_id}`,
  case_law = false, approval = "approval-1" } = {}) {
  const fixtureBytes = Buffer.from(body, "utf8");
  return { tenant_id, source_id,
    source_kind: case_law ? "case_law_document" : "internal_matter_document",
    matter_id, document_id, version_id, content_sha256: sha256Hex(fixtureBytes),
    title, fixture_bytes: fixtureBytes,
    ...(case_law ? { court: "대법원", case_number: "2024다12345",
      decision_date: "2026-05-14",
      source_url: "https://glaw.scourt.go.kr/precedent/2024da12345",
      source_reference: "대법원 2026. 5. 14. 선고 2024다12345 판결" } : {}),
    approval_id: approval, approval_batch_id: "batch-approved-1",
    approval_decision_id: `decision:${approval}`,
    approval_authority: "vault-approved-precedent-corpus-v1",
    approved_by: ACTOR, approved_at: "2026-08-08T00:00:00.000Z",
    actor_id: ACTOR, idempotency_key: `register:${source_id}:${approval}` };
}

function repository(pool, secret = SECRET) {
  const keys = derivePrecedentAuthorityKeys(secret);
  return createPostgresPrecedentRepository({ pool,
    cursorSecret: keys.cursor, extractionReceiptSecret: keys.extraction_receipt });
}

function extractor(pool, storage, secret = SECRET) {
  return createImmutablePrecedentExtractionAuthority({ pool, storage,
    receiptSecret: derivePrecedentAuthorityKeys(secret).extraction_receipt });
}

async function index(repo, extraction, entry) {
  const extracted = await extraction.extractSource({ tenant_id: entry.tenant_id,
    source_id: entry.source_id, actor_id: ACTOR });
  return repo.indexSource({ tenant_id: entry.tenant_id, source_id: entry.source_id,
    actor_id: ACTOR, metadata_text: extracted.metadata_text,
    body_text: extracted.body_text, extraction_receipt: extracted.extraction_receipt });
}

function searchInput(overrides = {}) {
  return { tenant_id: TENANT, matter_id: "matter-current", actor_id: ACTOR,
    request_occurrence_id: `request:${randomUUID()}`,
    authorization_decision_sha256: digest("d"),
    authorized_source_set_sha256: digest("e"), query: "손해 fiduciary",
    allowed_document_ids: [], limit: 20, ...overrides };
}

test("internal precedent citations navigate through the canonical Vault document route", () => {
  const href = buildVaultDocumentNavigationHref("document:precedent-1");
  assert.equal(href, "?view=vault&document_id=document%3Aprecedent-1#vault-search-documents");
  const navigated = new URL(href, "https://amic-os.example/app");
  assert.equal(navigated.pathname, "/app");
  assert.equal(navigated.searchParams.get("view"), "vault");
  assert.equal(navigated.searchParams.get("document_id"), "document:precedent-1");
  assert.equal(navigated.hash, "#vault-search-documents");
});

test("precedent cursor and immutable extraction receipts use distinct derived keys", () => {
  const keys = derivePrecedentAuthorityKeys(SECRET);
  assert.equal(Buffer.from(keys.cursor).equals(Buffer.from(keys.extraction_receipt)), false);
  assert.throws(() => createPostgresPrecedentRepository({ pool: { connect() {} },
    cursorSecret: keys.cursor, extractionReceiptSecret: keys.cursor }), /must be distinct/u);
});

test("approved corpus lifecycle is current-version, protection, receipt, restart, and tenant safe", async (t) => {
  const fixture = await createMigratedPostgresFixture(t);
  if (!fixture) return;
  const storage = createLocalStorageAdapter({ adapter_id: "precedent-lifecycle" });
  const repo = repository(fixture.appPool);
  const extraction = extractor(fixture.appPool, storage);
  const first = source({ source_id: "source-a", matter_id: "matter-a",
    document_id: "document-a", version_id: "version-a-1",
    title: "손해 fiduciary 검토", body: "손해 분석 fiduciary duty" });
  await commitDocument(fixture.appPool, storage, first);
  const privilegeReplay = await repo.classifyDocumentPrivilege({ tenant_id: TENANT,
    document_id: first.document_id, label_id: `privilege:${first.version_id}:cleared`,
    classification: "not_privileged", authority: "dms-privilege-review-v1",
    decision_id: `decision:${first.version_id}`,
    provenance_sha256: sha256Hex(Buffer.from(`privilege:${first.version_id}`)),
    applied_by: ACTOR, applied_at: "2026-08-08T00:30:00.000Z" });
  assert.equal(privilegeReplay.replayed, true);
  assert.equal(privilegeReplay.applied_at, "2026-08-08T00:00:00.000Z");
  const registered = await repo.registerSource(first);
  assert.equal(registered.source.approval_batch_id, "batch-approved-1");
  assert.equal((await repo.readiness({ tenant_id: TENANT,
    allowed_document_ids: [first.document_id] })).safe_error_code, "PRECEDENT_INDEX_STALE");
  const indexed = await index(repo, extraction, first);
  assert.equal((await index(repo, extraction, first)).replayed, true);
  assert.ok(indexed.index_hash);
  assert.equal((await repository(fixture.appPool).readiness({ tenant_id: TENANT,
    allowed_document_ids: [first.document_id] })).runtime_ready, true);

  const trustedExtraction = await extraction.extractSource({ tenant_id: TENANT,
    source_id: first.source_id, actor_id: ACTOR });
  const substitutedStorage = Object.freeze({ ...storage,
    async getObject(input) {
      const original = await storage.getObject(input);
      return Object.freeze({ ...original, bytes: Buffer.from("substituted immutable bytes") });
    } });
  await assert.rejects(extractor(fixture.appPool, substitutedStorage).extractSource({
    tenant_id: TENANT, source_id: first.source_id, actor_id: ACTOR }),
  (error) => error.safe_error_code === "PRECEDENT_EXTRACTION_CONTENT_MISMATCH");
  await assert.rejects(repo.indexSource({ tenant_id: TENANT, source_id: first.source_id,
    actor_id: ACTOR, metadata_text: trustedExtraction.metadata_text,
    body_text: `${trustedExtraction.body_text} substituted`,
    extraction_receipt: trustedExtraction.extraction_receipt }),
  (error) => error.safe_error_code === "PRECEDENT_EXTRACTION_RECEIPT_MISMATCH");
  assert.equal((await repository(fixture.appPool).indexSource({ tenant_id: TENANT,
    source_id: first.source_id, actor_id: ACTOR,
    metadata_text: trustedExtraction.metadata_text, body_text: trustedExtraction.body_text,
    extraction_receipt: trustedExtraction.extraction_receipt })).replayed, true);
  await assert.rejects(repository(fixture.appPool, `${SECRET}-different`).indexSource({
    tenant_id: TENANT, source_id: first.source_id, actor_id: ACTOR,
    metadata_text: trustedExtraction.metadata_text, body_text: trustedExtraction.body_text,
    extraction_receipt: trustedExtraction.extraction_receipt }), /signature is invalid/u);

  const refreshed = { ...source({ source_id: "source-a", matter_id: "matter-a",
    document_id: "document-a", version_id: "version-a-2",
    title: "손해 fiduciary 검토 개정", body: "개정 손해 fiduciary",
    approval: "approval-2" }), approved_at: "2026-08-08T01:00:00.000Z" };
  await commitDocument(fixture.appPool, storage, { ...refreshed, version_number: 2 });
  assert.equal((await repo.registerSource(refreshed)).source.source_revision, 2);
  assert.equal((await repo.readiness({ tenant_id: TENANT,
    allowed_document_ids: [first.document_id] })).runtime_ready, false);
  await index(repo, extraction, refreshed);
  assert.equal((await repo.readiness({ tenant_id: TENANT,
    allowed_document_ids: [first.document_id] })).runtime_ready, true);

  const protectedSource = source({ source_id: "source-protected", matter_id: "matter-protected",
    document_id: "document-protected", version_id: "version-protected-1",
    title: "보호 문서" });
  await commitDocument(fixture.appPool, storage, { ...protectedSource, privileged: true });
  await assert.rejects(repo.registerSource(protectedSource),
    (error) => error.safe_error_code === "PRECEDENT_SOURCE_INELIGIBLE");
  const unknownSource = source({ source_id: "source-unknown", matter_id: "matter-unknown",
    document_id: "document-unknown", version_id: "version-unknown-1",
    title: "미분류 문서" });
  await commitDocument(fixture.appPool, storage, { ...unknownSource, privilege_unknown: true });
  await assert.rejects(repo.registerSource(unknownSource),
    (error) => error.safe_error_code === "PRECEDENT_SOURCE_INELIGIBLE");
  const heldSource = source({ source_id: "source-held", matter_id: "matter-held",
    document_id: "document-held", version_id: "version-held-1",
    title: "보존 문서" });
  await commitDocument(fixture.appPool, storage, { ...heldSource,
    legal_hold_status: "active" });
  await assert.rejects(repo.registerSource(heldSource),
    (error) => error.safe_error_code === "PRECEDENT_SOURCE_INELIGIBLE");

  const heldAfterApproval = source({ source_id: "source-held-after", matter_id: "matter-held-after",
    document_id: "document-held-after", version_id: "version-held-after-1",
    title: "색인 전 보존 문서" });
  await commitDocument(fixture.appPool, storage, heldAfterApproval);
  await repo.registerSource(heldAfterApproval);
  await createPostgresDmsUploadRuntime({ pool: fixture.appPool, storage,
    clock: () => new Date("2026-08-08T02:00:00.000Z") }).placeLegalHold({
      tenant_id: TENANT, legal_hold_id: "hold:after-approval",
      document_id: heldAfterApproval.document_id,
      object_id: `object:${heldAfterApproval.version_id}`,
      created_by: ACTOR, reason: "hold after approval" });
  await assert.rejects(index(repo, extraction, heldAfterApproval),
    (error) => error.safe_error_code === "PRECEDENT_SOURCE_NOT_FOUND");

  await repo.classifyDocumentPrivilege({ tenant_id: TENANT, document_id: first.document_id,
    label_id: "privilege:source-a:protected", classification: "privileged",
    authority: "dms-privilege-review-v1", decision_id: "decision:source-a:protected",
    provenance_sha256: digest("1"), applied_by: ACTOR,
    applied_at: "2026-08-08T03:00:00.000Z" });
  await assert.rejects(repo.classifyDocumentPrivilege({ tenant_id: TENANT,
    document_id: first.document_id,
    label_id: `privilege:${refreshed.version_id}:cleared`,
    classification: "not_privileged", authority: "dms-privilege-review-v1",
    decision_id: `decision:${refreshed.version_id}`,
    provenance_sha256: sha256Hex(Buffer.from(`privilege:${refreshed.version_id}`)),
    applied_by: ACTOR, applied_at: "2026-08-08T03:30:00.000Z" }),
  (error) => error.safe_error_code === "PRECEDENT_PRIVILEGE_DECISION_STALE");
  assert.equal((await repo.listSourceDescriptors({ tenant_id: TENANT }))
    .some(({ source_id }) => source_id === first.source_id), true);
  assert.equal((await repo.readiness({ tenant_id: TENANT })).runtime_ready, false);
  const privilegedSearch = await repo.search(searchInput({ query: "개정 fiduciary",
    allowed_document_ids: [first.document_id],
    request_occurrence_id: "request:protected:privileged" }));
  assert.deepEqual(privilegedSearch.items, []);
  await repo.classifyDocumentPrivilege({ tenant_id: TENANT, document_id: first.document_id,
    label_id: "privilege:source-a:cleared-again", classification: "not_privileged",
    authority: "dms-privilege-review-v1", decision_id: "decision:source-a:cleared-again",
    provenance_sha256: digest("2"), applied_by: ACTOR,
    applied_at: "2026-08-08T04:00:00.000Z" });
  await createPostgresDmsUploadRuntime({ pool: fixture.appPool, storage,
    clock: () => new Date("2026-08-08T04:00:00.000Z") }).placeLegalHold({
      tenant_id: TENANT, legal_hold_id: "hold:source-a",
      document_id: first.document_id, object_id: `object:${refreshed.version_id}`,
      created_by: ACTOR, reason: "search exclusion hold" });
  const heldSearch = await repo.search(searchInput({ query: "개정 fiduciary",
    allowed_document_ids: [first.document_id],
    request_occurrence_id: "request:protected:legal-hold" }));
  assert.deepEqual(heldSearch.items, []);

  const foreign = source({ tenant_id: OTHER_TENANT, source_id: "source-foreign",
    matter_id: "matter-foreign", document_id: "document-foreign",
    version_id: "version-foreign-1", title: "foreign" });
  await commitDocument(fixture.appPool, storage, foreign);
  await repo.registerSource(foreign);
  await index(repo, extraction, foreign);
  const crossTenantRows = await withPostgresTransaction(fixture.appPool,
    { tenant_id: TENANT, readOnly: true }, (client) => client.query(
      "SELECT source_id FROM lawos_dms.precedent_sources WHERE tenant_id=$1", [OTHER_TENANT]));
  assert.equal(crossTenantRows.rowCount, 0);
  assert.deepEqual((await repo.listSourceDescriptors({ tenant_id: OTHER_TENANT }))
    .map(({ source_id }) => source_id), ["source-foreign"]);
});

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

test("mixed Korean-English search, HMAC cursor, insertion snapshot, and audit are deterministic", async (t) => {
  const fixture = await createMigratedPostgresFixture(t);
  if (!fixture) return;
  const storage = createLocalStorageAdapter({ adapter_id: "precedent-search" });
  const repo = repository(fixture.appPool);
  const extraction = extractor(fixture.appPool, storage);
  const entries = [
    source({ source_id: "source-1", matter_id: "matter-1", document_id: "document-1",
      version_id: "version-1", title: "손해배상 내부 검토",
      body: "손해 분석 fiduciary duty" }),
    source({ source_id: "source-2", matter_id: "matter-2", document_id: "document-2",
      version_id: "version-2", title: "계약상 책임 판결",
      body: "손해 분석 fiduciary duty", case_law: true }),
    source({ source_id: "source-denied", matter_id: "matter-denied", document_id: "document-denied",
      version_id: "version-denied", title: "손해 fiduciary denied",
      body: "denied raw body" }),
  ];
  for (const entry of entries) {
    await commitDocument(fixture.appPool, storage, entry);
    await repo.registerSource(entry);
    await index(repo, extraction, entry);
  }
  const allowed = [entries[0].document_id, entries[1].document_id];
  const first = await repo.search(searchInput({ allowed_document_ids: allowed, limit: 1,
    request_occurrence_id: "request:mixed:1" }));
  assert.equal(first.items.length, 1);
  assert.equal(JSON.stringify(first).includes("source-denied"), false);
  assert.ok(first.next_cursor);

  const inserted = source({ source_id: "source-0-new", matter_id: "matter-new",
    document_id: "document-new", version_id: "version-new",
    title: "손해 fiduciary 새 문서", body: "손해 fiduciary" });
  await commitDocument(fixture.appPool, storage, inserted);
  await repo.registerSource(inserted);
  await index(repo, extraction, inserted);
  const second = await repo.search(searchInput({ allowed_document_ids: [...allowed, inserted.document_id],
    limit: 1, cursor: first.next_cursor, request_occurrence_id: "request:mixed:2" }));
  assert.notEqual(second.items[0]?.source_id, first.items[0].source_id);
  assert.equal(second.items.some(({ source_id }) => source_id === inserted.source_id), false);

  const tampered = `${first.next_cursor.slice(0, -1)}${first.next_cursor.endsWith("a") ? "b" : "a"}`;
  await assert.rejects(repo.search(searchInput({ allowed_document_ids: allowed,
    cursor: tampered })), (error) => error.safe_error_code === "PRECEDENT_CURSOR_STALE");
  await assert.rejects(repository(fixture.appPool, `${SECRET}-rotated`).search(searchInput({
    allowed_document_ids: allowed, cursor: first.next_cursor })),
  (error) => error.safe_error_code === "PRECEDENT_CURSOR_STALE");
  await assert.rejects(repo.search(searchInput({ allowed_document_ids: allowed,
    cursor: first.next_cursor, query: "손해 different" })),
  (error) => error.safe_error_code === "PRECEDENT_CURSOR_STALE");
  const oldAuthority = createPrecedentCursorAuthority({ secret: SECRET, indexVersion: "old-index" });
  const newAuthority = createPrecedentCursorAuthority({ secret: SECRET, indexVersion: PRECEDENT_INDEX_VERSION });
  const old = oldAuthority.issue({ fingerprint: "fingerprint", snapshot_at: new Date().toISOString(),
    rank: "1", source_id: "source-1" });
  assert.throws(() => newAuthority.verify(old, "fingerprint"),
    (error) => error.safe_error_code === "PRECEDENT_CURSOR_STALE");

  await repo.search(searchInput({ allowed_document_ids: allowed,
    request_occurrence_id: "request:audit-distinct:1" }));
  await repo.search(searchInput({ allowed_document_ids: allowed,
    request_occurrence_id: "request:audit-distinct:2" }));
  const audit = await withPostgresTransaction(fixture.appPool,
    { tenant_id: TENANT, readOnly: true }, (client) => client.query(
      `SELECT payload FROM lawos_dms.audit_events WHERE tenant_id=$1
        AND event_type='dms.precedent_source.searched'
        AND payload->>'request_occurrence_id' LIKE 'request:audit-distinct:%'
        ORDER BY payload->>'request_occurrence_id'`, [TENANT]));
  assert.equal(audit.rowCount, 2);
  for (const { payload } of audit.rows) {
    assert.match(payload.authorization_decision_sha256, /^[a-f0-9]{64}$/u);
    assert.match(payload.authorized_source_set_sha256, /^[a-f0-9]{64}$/u);
    assert.match(payload.query_sha256, /^[a-f0-9]{64}$/u);
    assert.match(payload.page_fingerprint_sha256, /^[a-f0-9]{64}$/u);
    assert.equal(JSON.stringify(payload).includes("permission_ref"), false);
    assert.equal(JSON.stringify(payload).includes("손해 분석"), false);
  }
});

test("readiness detects exact checksum, GIN, FORCE RLS, trigger, extension, and role drift", async (t) => {
  const cases = [
    ["checksum", async (fixture) => fixture.adminPool.query(
      "UPDATE lawos_meta.schema_migrations SET checksum=$1 WHERE migration_id='012_dms_precedent_search'", [digest("0")])],
    ["gin", async (fixture) => fixture.adminPool.query("DROP INDEX lawos_dms.dms_precedent_search_vector_gin")],
    ["rls", async (fixture) => fixture.adminPool.query("ALTER TABLE lawos_dms.precedent_sources NO FORCE ROW LEVEL SECURITY")],
    ["privilege-rls", async (fixture) => fixture.adminPool.query("ALTER TABLE lawos_dms.document_privilege_labels NO FORCE ROW LEVEL SECURITY")],
    ["trigger", async (fixture) => fixture.adminPool.query("ALTER TABLE lawos_dms.precedent_sources DISABLE TRIGGER dms_precedent_source_guard")],
    ["privilege-trigger", async (fixture) => fixture.adminPool.query("ALTER TABLE lawos_dms.document_privilege_labels DISABLE TRIGGER dms_document_privilege_label_guard")],
    ["extension", async (fixture) => fixture.adminPool.query("DROP EXTENSION pg_trgm CASCADE")],
    ["authority", async (fixture) => fixture.adminPool.query("REVOKE INSERT ON lawos_dms.precedent_extraction_receipts FROM lawos_app")],
    ["privilege-authority", async (fixture) => fixture.adminPool.query("REVOKE INSERT ON lawos_dms.document_privilege_labels FROM lawos_app")],
    ["privilege-authority-broad", async (fixture) => fixture.adminPool.query("GRANT UPDATE ON lawos_dms.document_privilege_labels TO lawos_app")],
  ];
  for (const [name, mutate] of cases) {
    await t.test(name, async (nested) => {
      const fixture = await createMigratedPostgresFixture(nested);
      if (!fixture) return;
      const repo = repository(fixture.appPool);
      const before = await repo.readiness({ tenant_id: TENANT });
      assert.equal(before.runtime_ready, true);
      assert.equal(before.authoritative, true);
      await mutate(fixture);
      const after = await repo.readiness({ tenant_id: TENANT });
      assert.equal(after.runtime_ready, false);
      assert.equal(after.authoritative, false);
      assert.equal(after.production_ready_claim, false);
    });
  }
  const migration = listPostgresFoundationMigrations().find(({ id }) => id === "012_dms_precedent_search");
  assert.match(migration.checksum, /^[a-f0-9]{64}$/u);
});

test("production mixed-term query plan uses installed PostgreSQL GIN indexes", async (t) => {
  const fixture = await createMigratedPostgresFixture(t);
  if (!fixture) return;
  const batch = "batch-explain";
  await fixture.adminPool.query(`INSERT INTO lawos_dms.documents
    (tenant_id,document_id,matter_id,workspace_id,title,status,current_version_id,
     permission_envelope_id,audit_trace_id)
    SELECT $1,'document-explain-'||n,'matter-explain-'||n,'workspace-explain-'||n,
      'neutral corpus row '||n,'active',NULL,'permission-explain-'||n,'audit-explain-'||n
      FROM generate_series(1,1000) n`, [TENANT]);
  await fixture.adminPool.query(`INSERT INTO lawos_dms.file_objects
    (tenant_id,file_object_id,object_id,adapter_id,storage_pointer_ref,sha256,
     byte_size,content_type,status)
    SELECT $1,'file-explain-'||n,'object-explain-'||n,'test','opaque:'||n,
      md5(n::text)||md5(n::text),10,'text/plain','committed'
      FROM generate_series(1,1000) n`, [TENANT]);
  await fixture.adminPool.query(`INSERT INTO lawos_dms.document_versions
    (tenant_id,version_id,document_id,version_number,file_object_id,sha256,created_by)
    SELECT $1,'version-explain-'||n,'document-explain-'||n,1,'file-explain-'||n,
      md5(n::text)||md5(n::text),$2 FROM generate_series(1,1000) n`, [TENANT, ACTOR]);
  await fixture.adminPool.query(`UPDATE lawos_dms.documents SET current_version_id=
    replace(document_id,'document-','version-') WHERE tenant_id=$1
    AND document_id LIKE 'document-explain-%'`, [TENANT]);
  await fixture.adminPool.query(`INSERT INTO lawos_dms.precedent_sources
    (tenant_id,source_id,source_kind,matter_id,document_id,version_id,content_sha256,
     title,approval_id,approval_batch_id,approval_decision_id,approval_authority,
     approved_by,approved_at,registered_by,updated_by)
    SELECT $1,'source-explain-'||n,'internal_matter_document','matter-explain-'||n,
      'document-explain-'||n,'version-explain-'||n,md5(n::text)||md5(n::text),
      'neutral corpus row '||n,'approval-explain-'||n,$2,'decision-explain-'||n,
      'vault-approved-precedent-corpus-v1',$3,clock_timestamp(),$3,$3
      FROM generate_series(1,1000) n`, [TENANT, batch, ACTOR]);
  await fixture.adminPool.query(`INSERT INTO lawos_dms.precedent_extraction_receipts
    (tenant_id,receipt_id,source_id,document_id,version_id,content_sha256,extractor_id,
     text_sha256,character_count,issued_by,issued_at,authority,receipt_signature)
    SELECT $1,'receipt-explain-'||n,'source-explain-'||n,'document-explain-'||n,
      'version-explain-'||n,md5(n::text)||md5(n::text),'test-extractor',
      md5(('text:'||n)::text)||md5(('text:'||n)::text),0,$2,clock_timestamp(),
      'dms-immutable-version-extractor-v1',md5(('sig:'||n)::text)||md5(('sig:'||n)::text)
      FROM generate_series(1,1000) n`, [TENANT, ACTOR]);
  await fixture.adminPool.query(`INSERT INTO lawos_dms.precedent_search_index
    (tenant_id,source_id,source_revision,document_id,version_id,content_sha256,
     extraction_receipt_id,extractor_id,text_sha256,index_version,index_hash,
     title_text,metadata_text,body_text,normalized_text)
    SELECT $1,'source-explain-'||n,1,'document-explain-'||n,'version-explain-'||n,
      md5(n::text)||md5(n::text),'receipt-explain-'||n,'test-extractor',
      md5(('text:'||n)::text)||md5(('text:'||n)::text),$2,
      md5(('index:'||n)::text)||md5(('index:'||n)::text),
      'neutral corpus row '||n,'','','neutral corpus row '||n
      FROM generate_series(1,1000) n`, [TENANT, PRECEDENT_INDEX_VERSION]);
  await fixture.adminPool.query("ANALYZE lawos_dms.precedent_search_index");
  await fixture.adminPool.query("SET enable_seqscan=off");
  await fixture.adminPool.query("SET enable_indexscan=off");
  const plan = await fixture.adminPool.query(`EXPLAIN (FORMAT JSON,COSTS OFF) ${PRECEDENT_SEARCH_SQL}`,
    [TENANT, ["document-1"], PRECEDENT_INDEX_VERSION, new Date().toISOString(), false,
      "matter-current", "손해 fiduciary", ["손해", "fiduciary"], ["%손해%", "%fiduciary%"],
      null, "", 21]);
  const text = JSON.stringify(plan.rows);
  assert.match(text, /dms_precedent_search_vector_gin/u);
  assert.match(text, /dms_precedent_search_korean_fallback_gin/u);
});
