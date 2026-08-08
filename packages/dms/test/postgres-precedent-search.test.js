import assert from "node:assert/strict";
import test from "node:test";
import { randomUUID } from "node:crypto";
import { createMigratedPostgresFixture } from "../../persistence/test/helpers/disposable-postgres.js";
import { withPostgresTransaction } from "../../persistence/src/postgres/transaction.js";
import { listPostgresFoundationMigrations } from "../../persistence/src/postgres/migration-catalog.js";
import { executeApprovedPrecedentImport } from "../src/search/precedent-import-command.js";
import {
  PRECEDENT_INDEX_VERSION,
  PRECEDENT_SEARCH_SQL,
  createPostgresPrecedentRepository,
  createPrecedentCursorAuthority,
  extractedTextSha256,
} from "../src/search/postgres-precedent-repository.js";

const TENANT = "tenant_precedent_alpha";
const OTHER_TENANT = "tenant_precedent_beta";
const ACTOR = "user_precedent_editor";
const SECRET = "precedent-test-authority-secret-material-20260808";

function digest(character) { return character.repeat(64); }

async function commitDocument(pool, { tenant_id = TENANT, matter_id, document_id,
  version_id, sha256, title, version_number = 1, privileged = false,
  legal_hold_status = "none" } = {}) {
  await withPostgresTransaction(pool, { tenant_id }, async (client) => {
    const fileId = `file:${version_id}`;
    const objectId = `object:${version_id}`;
    await client.query(`INSERT INTO lawos_dms.documents
      (tenant_id,document_id,matter_id,workspace_id,title,status,current_version_id,
       permission_envelope_id,audit_trace_id,privileged,legal_hold_status)
      VALUES ($1,$2,$3,$4,$5,'active',NULL,$6,$7,$8,$9)
      ON CONFLICT (tenant_id,document_id) DO NOTHING`,
    [tenant_id, document_id, matter_id, `workspace:${matter_id}`, title,
      `permission:${document_id}`, `audit:${document_id}`, privileged, legal_hold_status]);
    await client.query(`INSERT INTO lawos_dms.file_objects
      (tenant_id,file_object_id,object_id,adapter_id,storage_pointer_ref,sha256,
       byte_size,content_type,status)
      VALUES ($1,$2,$3,'precedent-test',$4,$5,100,'text/plain','committed')`,
    [tenant_id, fileId, objectId, `opaque:${version_id}`, sha256]);
    await client.query(`INSERT INTO lawos_dms.document_versions
      (tenant_id,version_id,document_id,version_number,file_object_id,sha256,created_by)
      VALUES ($1,$2,$3,$4,$5,$6,$7)`,
    [tenant_id, version_id, document_id, version_number, fileId, sha256, ACTOR]);
    await client.query(`UPDATE lawos_dms.documents SET current_version_id=$3,
      privileged=$4,legal_hold_status=$5,updated_at=clock_timestamp()
      WHERE tenant_id=$1 AND document_id=$2`,
    [tenant_id, document_id, version_id, privileged, legal_hold_status]);
  });
}

function source({ tenant_id = TENANT, source_id, matter_id, document_id,
  version_id, content_sha256, title, case_law = false, approval = "approval-1" } = {}) {
  return { tenant_id, source_id,
    source_kind: case_law ? "case_law_document" : "internal_matter_document",
    matter_id, document_id, version_id, content_sha256, title,
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
  return createPostgresPrecedentRepository({ pool, authoritySecret: secret });
}

async function index(repo, entry, metadata, body, suffix = "1") {
  const receipt = repo.issueExtractionReceipt({ receipt_id: `extract:${entry.source_id}:${suffix}`,
    tenant_id: entry.tenant_id, source_id: entry.source_id,
    document_id: entry.document_id, version_id: entry.version_id,
    content_sha256: entry.content_sha256, extractor_id: "dms-text-v1",
    text_sha256: extractedTextSha256({ metadata_text: metadata, body_text: body }),
    character_count: metadata.length + body.length, issued_by: ACTOR,
    issued_at: "2026-08-08T00:00:00.000Z",
    authority: "dms-immutable-version-extractor-v1" });
  return repo.indexSource({ tenant_id: entry.tenant_id, source_id: entry.source_id,
    actor_id: ACTOR, metadata_text: metadata, body_text: body,
    extraction_receipt: receipt });
}

function searchInput(overrides = {}) {
  return { tenant_id: TENANT, matter_id: "matter-current", actor_id: ACTOR,
    request_occurrence_id: `request:${randomUUID()}`,
    authorization_decision_sha256: digest("d"),
    authorized_source_set_sha256: digest("e"), query: "손해 fiduciary",
    allowed_document_ids: [], limit: 20, ...overrides };
}

test("approved corpus lifecycle is current-version, protection, receipt, restart, and tenant safe", async (t) => {
  const fixture = await createMigratedPostgresFixture(t);
  if (!fixture) return;
  const repo = repository(fixture.appPool);
  const first = source({ source_id: "source-a", matter_id: "matter-a",
    document_id: "document-a", version_id: "version-a-1",
    content_sha256: digest("a"), title: "손해 fiduciary 검토" });
  await commitDocument(fixture.appPool, { ...first, sha256: first.content_sha256 });
  const registered = await repo.registerSource(first);
  assert.equal(registered.source.approval_batch_id, "batch-approved-1");
  assert.equal((await repo.readiness({ tenant_id: TENANT,
    allowed_document_ids: [first.document_id] })).safe_error_code, "PRECEDENT_INDEX_STALE");
  const indexed = await index(repo, first, "계약 breach", "손해 분석 fiduciary duty");
  assert.equal((await index(repo, first, "계약 breach", "손해 분석 fiduciary duty")).replayed, true);
  assert.ok(indexed.index_hash);
  assert.equal((await repository(fixture.appPool).readiness({ tenant_id: TENANT,
    allowed_document_ids: [first.document_id] })).runtime_ready, true);

  const tamperedReceipt = repo.issueExtractionReceipt({ receipt_id: "extract:tampered",
    tenant_id: TENANT, source_id: first.source_id, document_id: first.document_id,
    version_id: first.version_id, content_sha256: first.content_sha256,
    extractor_id: "dms-text-v1", text_sha256: digest("f"), character_count: 1,
    issued_by: ACTOR, issued_at: "2026-08-08T00:00:00.000Z",
    authority: "dms-immutable-version-extractor-v1" });
  await assert.rejects(repo.indexSource({ tenant_id: TENANT, source_id: first.source_id,
    actor_id: ACTOR, metadata_text: "changed", body_text: "text",
    extraction_receipt: tamperedReceipt }),
  (error) => error.safe_error_code === "PRECEDENT_EXTRACTION_RECEIPT_MISMATCH");

  const refreshed = { ...first, version_id: "version-a-2", content_sha256: digest("b"),
    title: "손해 fiduciary 검토 개정", approval_id: "approval-2",
    approval_decision_id: "decision:approval-2", approved_at: "2026-08-08T01:00:00.000Z",
    idempotency_key: "register:source-a:2" };
  await commitDocument(fixture.appPool, { ...refreshed, sha256: refreshed.content_sha256,
    version_number: 2 });
  assert.equal((await repo.registerSource(refreshed)).source.source_revision, 2);
  assert.equal((await repo.readiness({ tenant_id: TENANT,
    allowed_document_ids: [first.document_id] })).runtime_ready, false);
  await index(repo, refreshed, "개정 계약", "개정 손해 fiduciary", "2");
  assert.equal((await repo.readiness({ tenant_id: TENANT,
    allowed_document_ids: [first.document_id] })).runtime_ready, true);

  const protectedSource = source({ source_id: "source-protected", matter_id: "matter-protected",
    document_id: "document-protected", version_id: "version-protected-1",
    content_sha256: digest("c"), title: "보호 문서" });
  await commitDocument(fixture.appPool, { ...protectedSource, sha256: protectedSource.content_sha256,
    privileged: true });
  await assert.rejects(repo.registerSource(protectedSource),
    (error) => error.safe_error_code === "PRECEDENT_SOURCE_INELIGIBLE");
  const heldSource = source({ source_id: "source-held", matter_id: "matter-held",
    document_id: "document-held", version_id: "version-held-1",
    content_sha256: digest("4"), title: "보존 문서" });
  await commitDocument(fixture.appPool, { ...heldSource, sha256: heldSource.content_sha256,
    legal_hold_status: "active" });
  await assert.rejects(repo.registerSource(heldSource),
    (error) => error.safe_error_code === "PRECEDENT_SOURCE_INELIGIBLE");

  const heldAfterApproval = source({ source_id: "source-held-after", matter_id: "matter-held-after",
    document_id: "document-held-after", version_id: "version-held-after-1",
    content_sha256: digest("9"), title: "색인 전 보존 문서" });
  await commitDocument(fixture.appPool, { ...heldAfterApproval,
    sha256: heldAfterApproval.content_sha256 });
  await repo.registerSource(heldAfterApproval);
  await withPostgresTransaction(fixture.appPool, { tenant_id: TENANT }, (client) =>
    client.query("UPDATE lawos_dms.documents SET legal_hold_status='active' WHERE tenant_id=$1 AND document_id=$2",
      [TENANT, heldAfterApproval.document_id]));
  await assert.rejects(index(repo, heldAfterApproval, "held", "held body", "held"),
    (error) => error.safe_error_code === "PRECEDENT_SOURCE_NOT_FOUND");

  await withPostgresTransaction(fixture.appPool, { tenant_id: TENANT }, (client) =>
    client.query("UPDATE lawos_dms.documents SET privileged=true WHERE tenant_id=$1 AND document_id=$2",
      [TENANT, first.document_id]));
  assert.deepEqual(await repo.listSourceDescriptors({ tenant_id: TENANT }), []);
  assert.equal((await repo.readiness({ tenant_id: TENANT })).runtime_ready, false);
  const privilegedSearch = await repo.search(searchInput({ query: "개정 fiduciary",
    allowed_document_ids: [first.document_id],
    request_occurrence_id: "request:protected:privileged" }));
  assert.deepEqual(privilegedSearch.items, []);
  await withPostgresTransaction(fixture.appPool, { tenant_id: TENANT }, (client) =>
    client.query(`UPDATE lawos_dms.documents
      SET privileged=false,legal_hold_status='active'
      WHERE tenant_id=$1 AND document_id=$2`, [TENANT, first.document_id]));
  const heldSearch = await repo.search(searchInput({ query: "개정 fiduciary",
    allowed_document_ids: [first.document_id],
    request_occurrence_id: "request:protected:legal-hold" }));
  assert.deepEqual(heldSearch.items, []);

  const foreign = source({ tenant_id: OTHER_TENANT, source_id: "source-foreign",
    matter_id: "matter-foreign", document_id: "document-foreign",
    version_id: "version-foreign-1", content_sha256: digest("6"), title: "foreign" });
  await commitDocument(fixture.appPool, { ...foreign, sha256: foreign.content_sha256 });
  await repo.registerSource(foreign);
  await index(repo, foreign, "foreign", "foreign body", "foreign");
  const crossTenantRows = await withPostgresTransaction(fixture.appPool,
    { tenant_id: TENANT, readOnly: true }, (client) => client.query(
      "SELECT source_id FROM lawos_dms.precedent_sources WHERE tenant_id=$1", [OTHER_TENANT]));
  assert.equal(crossTenantRows.rowCount, 0);
  assert.deepEqual((await repo.listSourceDescriptors({ tenant_id: OTHER_TENANT }))
    .map(({ source_id }) => source_id), ["source-foreign"]);
});

test("disable, unapprove, and approved import/index are durable and replay-safe", async (t) => {
  const fixture = await createMigratedPostgresFixture(t);
  if (!fixture) return;
  const repo = repository(fixture.appPool);
  const entries = ["disable", "unapprove"].map((action, indexValue) => source({
    source_id: `source-${action}`, matter_id: `matter-${action}`,
    document_id: `document-${action}`, version_id: `version-${action}-1`,
    content_sha256: digest(String(indexValue + 5)), title: `${action} source`,
    approval: `approval-${action}` }));
  for (const entry of entries) {
    await commitDocument(fixture.appPool, { ...entry, sha256: entry.content_sha256 });
    await repo.registerSource(entry);
    await index(repo, entry, "metadata", "body", entry.source_id);
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
    content_sha256: digest("7"), title: "승인 import" });
  await commitDocument(fixture.appPool, { ...imported, sha256: imported.content_sha256 });
  const manifest = { schema_version: "amic-os.precedent-import.v1", tenant_id: TENANT,
    batch_id: "batch-command-1", approval: { authority: "vault-approved-precedent-corpus-v1",
      approval_id: "approval-command-1", approval_decision_id: "decision-command-1",
      approved_by: ACTOR, approved_at: "2026-08-08T02:00:00.000Z" },
    sources: [{ ...imported, metadata_text: "승인 자료", body_text: "검증된 원문",
      extractor_id: "dms-text-v1" }] };
  const first = await executeApprovedPrecedentImport({ repository: repo, manifest, actor_id: ACTOR });
  const replay = await executeApprovedPrecedentImport({ repository: repo, manifest, actor_id: ACTOR });
  assert.equal(first.imported_count, 1);
  assert.equal(replay.results[0].replayed, true);
  assert.equal(JSON.stringify(first).includes("검증된 원문"), false);
  await assert.rejects(fixture.adminPool.query(
    "DELETE FROM lawos_dms.precedent_sources WHERE tenant_id=$1 AND source_id=$2",
    [TENANT, imported.source_id]), (error) => error.code === "55000");
  await assert.rejects(fixture.adminPool.query(
    "UPDATE lawos_dms.precedent_extraction_receipts SET issued_by='tampered' WHERE tenant_id=$1 AND source_id=$2",
    [TENANT, imported.source_id]), (error) => error.code === "55000");
  await assert.rejects(executeApprovedPrecedentImport({ repository: repo,
    manifest: { ...manifest, approval: { ...manifest.approval, authority: "client-asserted" } },
    actor_id: ACTOR }), /approval authority/u);
});

test("mixed Korean-English search, HMAC cursor, insertion snapshot, and audit are deterministic", async (t) => {
  const fixture = await createMigratedPostgresFixture(t);
  if (!fixture) return;
  const repo = repository(fixture.appPool);
  const entries = [
    source({ source_id: "source-1", matter_id: "matter-1", document_id: "document-1",
      version_id: "version-1", content_sha256: digest("1"), title: "손해배상 내부 검토" }),
    source({ source_id: "source-2", matter_id: "matter-2", document_id: "document-2",
      version_id: "version-2", content_sha256: digest("2"), title: "계약상 책임 판결", case_law: true }),
    source({ source_id: "source-denied", matter_id: "matter-denied", document_id: "document-denied",
      version_id: "version-denied", content_sha256: digest("3"), title: "손해 fiduciary denied" }),
  ];
  for (const entry of entries) {
    await commitDocument(fixture.appPool, { ...entry, sha256: entry.content_sha256 });
    await repo.registerSource(entry);
    await index(repo, entry, "contract fiduciary", "손해 분석 fiduciary duty", entry.source_id);
  }
  const allowed = [entries[0].document_id, entries[1].document_id];
  const first = await repo.search(searchInput({ allowed_document_ids: allowed, limit: 1,
    request_occurrence_id: "request:mixed:1" }));
  assert.equal(first.items.length, 1);
  assert.equal(JSON.stringify(first).includes("source-denied"), false);
  assert.ok(first.next_cursor);

  const inserted = source({ source_id: "source-0-new", matter_id: "matter-new",
    document_id: "document-new", version_id: "version-new",
    content_sha256: digest("8"), title: "손해 fiduciary 새 문서" });
  await commitDocument(fixture.appPool, { ...inserted, sha256: inserted.content_sha256 });
  await repo.registerSource(inserted);
  await index(repo, inserted, "fiduciary", "손해 fiduciary", "new");
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
    ["trigger", async (fixture) => fixture.adminPool.query("ALTER TABLE lawos_dms.precedent_sources DISABLE TRIGGER dms_precedent_source_guard")],
    ["extension", async (fixture) => fixture.adminPool.query("DROP EXTENSION pg_trgm CASCADE")],
    ["authority", async (fixture) => fixture.adminPool.query("REVOKE INSERT ON lawos_dms.precedent_extraction_receipts FROM lawos_app")],
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
