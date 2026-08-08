import assert from "node:assert/strict";
import test from "node:test";
import { createMigratedPostgresFixture } from "../../persistence/test/helpers/disposable-postgres.js";
import { PRECEDENT_INDEX_VERSION } from "../src/search/postgres-precedent-repository.js";
import { createLocalStorageAdapter } from "../src/storage/local-storage-adapter.js";
import {
  ACTOR,
  TENANT,
  commitDocument,
  digest,
  repository,
  searchInput,
  source,
} from "./precedent-test-helpers.js";

test("cross-document current-version drift leaks no result, count, or identifier", async (t) => {
  const fixture = await createMigratedPostgresFixture(t);
  if (!fixture) return;
  const storage = createLocalStorageAdapter({ adapter_id: "precedent-cross-document" });
  const repo = repository(fixture.appPool);
  const owner = source({ source_id: "unused-owner-source", matter_id: "matter-owner-alpha",
    document_id: "document-owner-alpha", version_id: "version-owner-alpha",
    title: "owner document", body: "owner bytes" });
  const foreign = source({ source_id: "unused-foreign-source", matter_id: "matter-foreign-beta",
    document_id: "document-foreign-beta", version_id: "version-foreign-beta",
    title: "foreign document", body: "손해 fiduciary cross document drift" });
  await commitDocument(fixture.appPool, storage, owner);
  await commitDocument(fixture.appPool, storage, foreign);

  const drift = source({ source_id: "source-cross-version-drift", matter_id: owner.matter_id,
    document_id: owner.document_id, version_id: foreign.version_id,
    title: "cross document drift", body: foreign.fixture_bytes });
  const labelId = "privilege:cross-version-drift";
  await fixture.adminPool.query(`INSERT INTO lawos_dms.document_privilege_labels
    (tenant_id,label_id,document_id,version_id,classification,search_disposition,
     authority,decision_id,provenance_sha256,applied_by,applied_at)
    VALUES ($1,$2,$3,$4,'not_privileged','eligible','dms-privilege-review-v1',
      'decision:cross-version-drift',$5,$6,clock_timestamp())`,
  [TENANT, labelId, owner.document_id, foreign.version_id, digest("a"), ACTOR]);
  await fixture.adminPool.query(`UPDATE lawos_dms.documents
    SET current_version_id=$3,current_privilege_label_id=$4,privilege_status='cleared'
    WHERE tenant_id=$1 AND document_id=$2`,
  [TENANT, owner.document_id, foreign.version_id, labelId]);
  await assert.rejects(repo.registerSource(drift),
    (error) => error.safe_error_code === "PRECEDENT_SOURCE_INELIGIBLE");

  await fixture.adminPool.query(`INSERT INTO lawos_dms.precedent_sources
    (tenant_id,source_id,source_kind,matter_id,document_id,version_id,content_sha256,
     title,approval_id,approval_batch_id,approval_decision_id,approval_authority,
     approved_by,approved_at,registered_by,updated_by)
    VALUES ($1,$2,'internal_matter_document',$3,$4,$5,$6,$7,'approval-drift',
      'batch-drift','decision-drift','vault-approved-precedent-corpus-v1',$8,
      clock_timestamp(),$8,$8)`,
  [TENANT, drift.source_id, drift.matter_id, drift.document_id, drift.version_id,
    drift.content_sha256, drift.title, ACTOR]);
  await fixture.adminPool.query(`INSERT INTO lawos_dms.precedent_extraction_receipts
    (tenant_id,receipt_id,source_id,document_id,version_id,content_sha256,extractor_id,
     text_sha256,character_count,issued_by,issued_at,authority,receipt_signature)
    VALUES ($1,'receipt-cross-version-drift',$2,$3,$4,$5,'extractor-drift',$6,0,$7,
      clock_timestamp(),'dms-immutable-version-extractor-v1',$8)`,
  [TENANT, drift.source_id, drift.document_id, drift.version_id,
    drift.content_sha256, digest("b"), ACTOR, digest("c")]);
  await fixture.adminPool.query(`INSERT INTO lawos_dms.precedent_search_index
    (tenant_id,source_id,source_revision,document_id,version_id,content_sha256,
     extraction_receipt_id,extractor_id,text_sha256,index_version,index_hash,
     title_text,metadata_text,body_text,normalized_text)
    VALUES ($1,$2,1,$3,$4,$5,'receipt-cross-version-drift','extractor-drift',$6,$7,$8,
      $9,'','손해 fiduciary cross document drift','손해 fiduciary cross document drift')`,
  [TENANT, drift.source_id, drift.document_id, drift.version_id,
    drift.content_sha256, digest("b"), PRECEDENT_INDEX_VERSION, digest("d"), drift.title]);

  const result = await repo.search(searchInput({ query: "손해 fiduciary",
    allowed_document_ids: [owner.document_id], request_occurrence_id: "request:cross-version-drift" }));
  assert.deepEqual(result.items, []);
  assert.equal(result.next_cursor, null);
  assert.equal(result.count_leak_prevented, true);
  const serialized = JSON.stringify(result);
  for (const identifier of [drift.source_id, owner.document_id, foreign.version_id]) {
    assert.equal(serialized.includes(identifier), false);
  }
  const readiness = await repo.readiness({ tenant_id: TENANT,
    allowed_document_ids: [owner.document_id] });
  assert.equal(readiness.runtime_ready, false);
  assert.equal(readiness.authoritative, false);
  assert.equal(JSON.stringify(readiness).includes(drift.source_id), false);
});
