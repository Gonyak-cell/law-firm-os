import assert from "node:assert/strict";
import test from "node:test";
import { createMigratedPostgresFixture } from "../../persistence/test/helpers/disposable-postgres.js";
import { listPostgresFoundationMigrations } from "../../persistence/src/postgres/migration-catalog.js";
import { withPostgresTransaction } from "../../persistence/src/postgres/transaction.js";
import {
  PRECEDENT_INDEX_VERSION,
  PRECEDENT_SEARCH_SQL,
  createPrecedentCursorAuthority,
} from "../src/search/postgres-precedent-repository.js";
import { createLocalStorageAdapter } from "../src/storage/local-storage-adapter.js";
import {
  ACTOR,
  SECRET,
  TENANT,
  commitDocument,
  digest,
  extractor,
  index,
  repository,
  searchInput,
  source,
} from "./precedent-test-helpers.js";

test("mixed, punctuated, and SQL-literal search stays parameterized and deterministic", async (t) => {
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
    source({ source_id: "source-punctuation", matter_id: "matter-punctuation",
      document_id: "document-punctuation", version_id: "version-punctuation",
      title: "판례 인용 및 조문", body: "대법원 2025다54321; 민법 제750조 -- 손해배상" }),
    source({ source_id: "source-sql-literal", matter_id: "matter-sql-literal",
      document_id: "document-sql-literal", version_id: "version-sql-literal",
      title: "SQL 문자열 증거",
      body: "손해'); DROP TABLE lawos_dms.precedent_sources; -- /* literal */" }),
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

  const punctuated = await repo.search(searchInput({
    query: "2025다54321; 민법 제750조 --",
    allowed_document_ids: [entries[3].document_id],
    request_occurrence_id: "request:punctuated-legal-citation",
  }));
  assert.deepEqual(punctuated.items.map(({ source_id }) => source_id), [entries[3].source_id]);
  const sqlLiteral = await repo.search(searchInput({
    query: "손해'); DROP TABLE lawos_dms.precedent_sources; -- /* literal */",
    allowed_document_ids: [entries[4].document_id],
    request_occurrence_id: "request:sql-control-literal",
  }));
  assert.deepEqual(sqlLiteral.items.map(({ source_id }) => source_id), [entries[4].source_id]);
  const schema = await fixture.adminPool.query(
    "SELECT to_regclass('lawos_dms.precedent_sources')::text AS relation, count(*)::int AS rows FROM lawos_dms.precedent_sources");
  assert.equal(schema.rows[0].relation, "lawos_dms.precedent_sources");
  assert.equal(schema.rows[0].rows, entries.length);

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
      "UPDATE lawos_meta.schema_migrations SET checksum=$1 WHERE migration_id='013_dms_precedent_search'", [digest("0")])],
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
  const migration = listPostgresFoundationMigrations().find(({ id }) => id === "013_dms_precedent_search");
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
