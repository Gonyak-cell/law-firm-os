import assert from "node:assert/strict";
import test from "node:test";
import {
  OUTLOOK_ADDIN_BOUNDED_CONTEXT,
  handleOutlookAddinApiRequest,
} from "../src/outlook-addin-runtime-context.js";
import { createImmutablePrecedentExtractionAuthority } from "../../../packages/dms/src/search/precedent-immutable-extractor.js";
import {
  createPostgresPrecedentRepository,
  derivePrecedentAuthorityKeys,
} from "../../../packages/dms/src/search/postgres-precedent-repository.js";
import { createLocalStorageAdapter } from "../../../packages/dms/src/storage/local-storage-adapter.js";
import { sha256Hex } from "../../../packages/dms/src/storage/storage-adapter.js";
import { createMigratedPostgresFixture } from "../../../packages/persistence/test/helpers/disposable-postgres.js";
import { withPostgresTransaction } from "../../../packages/persistence/src/postgres/transaction.js";
import {
  ACTOR,
  AUTHORITY_SECRET,
  CURRENT_MATTER,
  TENANT,
  commitDocument,
  indexSource,
  matterRepository,
  permissionContext,
  request,
  source,
} from "./outlook-precedent-test-helpers.js";

test("Outlook precedent route filters ACL and Ethical Wall sources before cited pagination", async (t) => {
  assert.ok(OUTLOOK_ADDIN_BOUNDED_CONTEXT.endpoints.includes("GET /api/outlook/precedents"));
  assert.ok(OUTLOOK_ADDIN_BOUNDED_CONTEXT.endpoints.includes("GET /api/outlook/precedents/readiness"));
  const fixture = await createMigratedPostgresFixture(t);
  if (!fixture) return;
  const storage = createLocalStorageAdapter({ adapter_id: "outlook-precedent-api" });
  const authorityKeys = derivePrecedentAuthorityKeys(AUTHORITY_SECRET);
  const repository = createPostgresPrecedentRepository({
    pool: fixture.appPool,
    cursorSecret: authorityKeys.cursor,
    extractionReceiptSecret: authorityKeys.extraction_receipt,
  });
  const extractor = createImmutablePrecedentExtractionAuthority({
    pool: fixture.appPool,
    storage,
    receiptSecret: authorityKeys.extraction_receipt,
  });
  const fixtures = [
    {
      source: source({ source_id: "precedent_allowed_internal",
        matter_id: "matter_allowed_internal", document_id: "document_allowed_internal",
        version_id: "version_allowed_internal_1", title: "손해배상 내부 검토",
        body: "손해배상 범위와 fiduciary duty damages 분석" }),
      body: "손해배상 범위와 fiduciary duty damages 분석",
    },
    {
      source: source({ source_id: "precedent_allowed_case",
        matter_id: "matter_allowed_case", document_id: "document_allowed_case",
        version_id: "version_allowed_case_1", title: "대법원 계약책임 판결",
        body: "fiduciary duty and contractual damages precedent", case_law: true }),
      body: "fiduciary duty and contractual damages precedent",
    },
    {
      source: source({ source_id: "precedent_denied", matter_id: "matter_denied",
        document_id: "document_denied", version_id: "version_denied_1",
        title: "damages damages damages", body: "denied raw body damages damages damages" }),
      body: "denied raw body damages damages damages",
    },
    {
      source: source({ source_id: "precedent_current", matter_id: CURRENT_MATTER,
        document_id: "document_current", version_id: "version_current_1",
        title: "current matter damages", body: "current matter body damages" }),
      body: "current matter body damages",
    },
  ];
  for (const entry of fixtures) {
    await commitDocument(fixture.appPool, storage, {
      matter_id: entry.source.matter_id, document_id: entry.source.document_id,
      version_id: entry.source.version_id, bytes: entry.body, title: entry.source.title });
    await repository.registerSource(entry.source);
    await indexSource(repository, extractor, entry);
  }

  const first = await request({ repository, query: { limit: "1" }, requestId: "req_precedent_page_1" });
  assert.equal(first.status, 200, JSON.stringify(first.body));
  assert.equal(first.body.items.length, 1);
  assert.equal(first.body.page_info.returned_count, 1);
  assert.equal(first.body.page_info.has_more, true);
  assert.ok(first.body.next_cursor);
  const second = await request({ repository,
    query: { limit: "1", cursor: first.body.next_cursor },
    requestId: "req_precedent_page_2" });
  assert.equal(second.status, 200);
  assert.notEqual(second.body.items[0].source_id, first.body.items[0].source_id);
  const combined = [...first.body.items, ...second.body.items];
  assert.deepEqual(new Set(combined.map((item) => item.source_id)), new Set([
    "precedent_allowed_internal", "precedent_allowed_case",
  ]));
  const caseLaw = combined.find((item) => item.source_kind === "case_law_document");
  assert.equal(caseLaw.citation.case_number, "2025다54321");
  assert.match(caseLaw.source_url, /^https:\/\//u);
  const internal = combined.find((item) => item.source_kind === "internal_matter_document");
  assert.equal(internal.source_url,
    `?view=vault&matter_id=matter_allowed_internal&document_id=document_allowed_internal&document_version_id=version_allowed_internal_1&document_sha256=${internal.content_sha256}#vault-search-documents`);
  const serialized = JSON.stringify([first.body, second.body]);
  assert.doesNotMatch(serialized, /precedent_denied|precedent_current|denied raw body|opaque:/u);
  assert.doesNotMatch(serialized, /denied_count|omitted_count|total_count|body_text|storage_pointer_ref"/u);
  assert.equal(first.body.count_leak_prevented, true);
  assert.equal(first.body.raw_body_included, false);
  assert.equal(first.body.storage_pointer_ref_included, false);
  assert.equal(first.body.authoritative, true);

  const readiness = await handleOutlookAddinApiRequest({
    pathname: "/api/outlook/precedents/readiness", method: "GET",
    query: { matter_id: CURRENT_MATTER }, context: permissionContext(),
    requestId: "req_precedent_readiness",
    runtime: { matterRuntime: { repository: matterRepository() },
      precedentSearchRuntime: { repository } },
  });
  assert.equal(readiness.status, 200);
  assert.equal(readiness.body.authoritative, true);
  assert.equal(readiness.body.runtime_ready, true);

  await repository.classifyDocumentPrivilege({ tenant_id: TENANT,
    document_id: "document_denied", label_id: "privilege:denied:protected",
    classification: "privileged", authority: "dms-privilege-review-v1",
    decision_id: "decision:denied:protected",
    provenance_sha256: sha256Hex(Buffer.from("denied protected provenance")),
    applied_by: ACTOR, applied_at: "2026-08-08T01:00:00.000Z" });
  const deniedProtectedReadiness = await handleOutlookAddinApiRequest({
    pathname: "/api/outlook/precedents/readiness", method: "GET",
    query: { matter_id: CURRENT_MATTER }, context: permissionContext(),
    requestId: "req_precedent_denied_protected_readiness",
    runtime: { matterRuntime: { repository: matterRepository() },
      precedentSearchRuntime: { repository } },
  });
  assert.equal(deniedProtectedReadiness.status, 200);
  assert.equal(JSON.stringify(deniedProtectedReadiness.body).includes("document_denied"), false);

  await commitDocument(fixture.appPool, storage, {
    matter_id: "matter_denied", document_id: "document_denied",
    version_id: "version_denied_2", version_number: 2,
    privilege_applied_at: "2026-08-08T02:00:00.000Z",
    bytes: "denied stale replacement bytes", title: "denied replacement" });
  const deniedStaleReadiness = await handleOutlookAddinApiRequest({
    pathname: "/api/outlook/precedents/readiness", method: "GET",
    query: { matter_id: CURRENT_MATTER }, context: permissionContext(),
    requestId: "req_precedent_denied_stale_readiness",
    runtime: { matterRuntime: { repository: matterRepository() },
      precedentSearchRuntime: { repository } },
  });
  assert.equal(deniedStaleReadiness.status, 200);
  assert.equal(JSON.stringify(deniedStaleReadiness.body).includes("document_denied"), false);

  const korean = await request({ repository, query: { q: "손해", limit: "20" },
    requestId: "req_precedent_korean" });
  assert.equal(korean.status, 200);
  assert.deepEqual(korean.body.items.map((item) => item.source_id), ["precedent_allowed_internal"]);

  const clientPermissionRefIsIgnored = await request({ repository,
    query: { permission_ref: "client-forged-decision", audit_hint_ref: "client-forged-audit" },
    requestId: "req_precedent_untrusted_client_refs" });
  assert.equal(clientPermissionRefIsIgnored.status, 200);
  const audit = await withPostgresTransaction(fixture.appPool,
    { tenant_id: TENANT, readOnly: true }, (client) => client.query(
      `SELECT payload FROM lawos_dms.audit_events WHERE tenant_id=$1
        AND event_type='dms.precedent_source.searched'
        AND payload->>'request_occurrence_id'=$2`,
      [TENANT, "req_precedent_untrusted_client_refs"]));
  assert.equal(audit.rowCount, 1);
  assert.equal(JSON.stringify(audit.rows[0].payload).includes("client-forged"), false);

  const invalidLimit = await request({ repository, query: { limit: "21" }, requestId: "req_precedent_limit" });
  assert.equal(invalidLimit.status, 400);
  assert.deepEqual(invalidLimit.body.safe_error_codes, ["OUTLOOK_PRECEDENT_VALIDATION_ERROR"]);
  const invalidCursor = await request({ repository, query: { cursor: "not-a-cursor" }, requestId: "req_precedent_cursor" });
  assert.equal(invalidCursor.status, 409);
  assert.deepEqual(invalidCursor.body.safe_error_codes, ["PRECEDENT_CURSOR_STALE"]);
  const tenantMismatch = await request({ repository,
    query: { tenant_id: "tenant_foreign" }, requestId: "req_precedent_tenant" });
  assert.equal(tenantMismatch.status, 403);
  assert.deepEqual(tenantMismatch.body.safe_error_codes, ["OUTLOOK_PRECEDENT_TENANT_MISMATCH"]);
  const deniedMatter = await request({ repository,
    context: permissionContext({ denyMatter: true }), requestId: "req_precedent_matter_denied" });
  assert.equal(deniedMatter.status, 403);
  assert.deepEqual(deniedMatter.body.safe_error_codes, ["OUTLOOK_PRECEDENT_PERMISSION_DENIED"]);
  const missingRuntime = await request({ repository: null, requestId: "req_precedent_unavailable" });
  assert.equal(missingRuntime.status, 503);
  assert.deepEqual(missingRuntime.body.safe_error_codes, ["OUTLOOK_PRECEDENT_RUNTIME_UNAVAILABLE"]);

  await commitDocument(fixture.appPool, storage, {
    matter_id: "matter_allowed_internal", document_id: "document_allowed_internal",
    version_id: "version_allowed_internal_2", version_number: 2,
    privilege_applied_at: "2026-08-08T02:00:00.000Z",
    bytes: "allowed replacement makes the authorized source stale",
    title: "손해배상 내부 검토 개정" });
  const stale = await request({ repository, requestId: "req_precedent_stale" });
  assert.equal(stale.status, 409);
  assert.deepEqual(stale.body.safe_error_codes, ["PRECEDENT_INDEX_STALE"]);
  assert.equal(JSON.stringify(stale.body).includes("document_allowed_internal"), false);
});
