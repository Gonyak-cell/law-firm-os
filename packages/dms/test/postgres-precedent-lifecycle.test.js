import assert from "node:assert/strict";
import test from "node:test";
import { createMigratedPostgresFixture } from "../../persistence/test/helpers/disposable-postgres.js";
import { withPostgresTransaction } from "../../persistence/src/postgres/transaction.js";
import { createPostgresDmsUploadRuntime } from "../src/postgres-upload-runtime.js";
import {
  buildVaultDocumentNavigationHref,
  createPostgresPrecedentRepository,
  derivePrecedentAuthorityKeys,
} from "../src/search/postgres-precedent-repository.js";
import { createLocalStorageAdapter } from "../src/storage/local-storage-adapter.js";
import { sha256Hex } from "../src/storage/storage-adapter.js";
import {
  ACTOR,
  OTHER_TENANT,
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

test("internal precedent citations navigate through the canonical Vault document route", () => {
  const href = buildVaultDocumentNavigationHref({
    matter_id: "matter:precedent-1",
    document_id: "document:precedent-1",
    version_id: "version:precedent-1",
    content_sha256: "a".repeat(64),
  });
  assert.equal(href, `?view=vault&matter_id=matter%3Aprecedent-1&document_id=document%3Aprecedent-1&document_version_id=version%3Aprecedent-1&document_sha256=${"a".repeat(64)}#vault-search-documents`);
  const navigated = new URL(href, "https://amic-os.example/app");
  assert.equal(navigated.pathname, "/app");
  assert.equal(navigated.searchParams.get("view"), "vault");
  assert.equal(navigated.searchParams.get("matter_id"), "matter:precedent-1");
  assert.equal(navigated.searchParams.get("document_id"), "document:precedent-1");
  assert.equal(navigated.searchParams.get("document_version_id"), "version:precedent-1");
  assert.equal(navigated.searchParams.get("document_sha256"), "a".repeat(64));
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
    async readObjectBounded(input) {
      const original = await storage.readObjectBounded(input);
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
    document_id: "document-protected", version_id: "version-protected-1", title: "보호 문서" });
  await commitDocument(fixture.appPool, storage, { ...protectedSource, privileged: true });
  await assert.rejects(repo.registerSource(protectedSource),
    (error) => error.safe_error_code === "PRECEDENT_SOURCE_INELIGIBLE");
  const unknownSource = source({ source_id: "source-unknown", matter_id: "matter-unknown",
    document_id: "document-unknown", version_id: "version-unknown-1", title: "미분류 문서" });
  await commitDocument(fixture.appPool, storage, { ...unknownSource, privilege_unknown: true });
  await assert.rejects(repo.registerSource(unknownSource),
    (error) => error.safe_error_code === "PRECEDENT_SOURCE_INELIGIBLE");
  const heldSource = source({ source_id: "source-held", matter_id: "matter-held",
    document_id: "document-held", version_id: "version-held-1", title: "보존 문서" });
  await commitDocument(fixture.appPool, storage, { ...heldSource, legal_hold_status: "active" });
  await assert.rejects(repo.registerSource(heldSource),
    (error) => error.safe_error_code === "PRECEDENT_SOURCE_INELIGIBLE");

  const heldAfterApproval = source({ source_id: "source-held-after", matter_id: "matter-held-after",
    document_id: "document-held-after", version_id: "version-held-after-1", title: "색인 전 보존 문서" });
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
    document_id: first.document_id, label_id: `privilege:${refreshed.version_id}:cleared`,
    classification: "not_privileged", authority: "dms-privilege-review-v1",
    decision_id: `decision:${refreshed.version_id}`,
    provenance_sha256: sha256Hex(Buffer.from(`privilege:${refreshed.version_id}`)), applied_by: ACTOR,
    applied_at: "2026-08-08T03:30:00.000Z" }),
  (error) => error.safe_error_code === "PRECEDENT_PRIVILEGE_DECISION_STALE");
  assert.equal((await repo.listSourceDescriptors({ tenant_id: TENANT }))
    .some(({ source_id }) => source_id === first.source_id), true);
  assert.equal((await repo.readiness({ tenant_id: TENANT })).runtime_ready, false);
  assert.deepEqual((await repo.search(searchInput({ query: "개정 fiduciary",
    allowed_document_ids: [first.document_id],
    request_occurrence_id: "request:protected:privileged" }))).items, []);
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
  assert.deepEqual((await repo.search(searchInput({ query: "개정 fiduciary",
    allowed_document_ids: [first.document_id],
    request_occurrence_id: "request:protected:legal-hold" }))).items, []);

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
