import assert from "node:assert/strict";
import test from "node:test";
import {
  OUTLOOK_ADDIN_BOUNDED_CONTEXT,
  handleOutlookAddinApiRequest,
} from "../src/outlook-addin-runtime-context.js";
import {
  createPostgresPrecedentRepository,
  derivePrecedentAuthorityKeys,
} from "../../../packages/dms/src/search/postgres-precedent-repository.js";
import { createImmutablePrecedentExtractionAuthority } from "../../../packages/dms/src/search/precedent-immutable-extractor.js";
import { createDocumentPrivilegeRepository } from "../../../packages/dms/src/search/document-privilege-repository.js";
import { createLocalStorageAdapter } from "../../../packages/dms/src/storage/local-storage-adapter.js";
import { sha256Hex } from "../../../packages/dms/src/storage/storage-adapter.js";
import { createMigratedPostgresFixture } from "../../../packages/persistence/test/helpers/disposable-postgres.js";
import { withPostgresTransaction } from "../../../packages/persistence/src/postgres/transaction.js";

const TENANT = "tenant_outlook_precedent";
const ACTOR = "user_outlook_precedent";
const CURRENT_MATTER = "matter_current";
const AUTHORITY_SECRET = "outlook-precedent-api-authority-secret-20260808";

async function commitDocument(pool, storage, {
  matter_id,
  document_id,
  version_id,
  bytes,
  title,
  version_number = 1,
  privilege_applied_at = "2026-08-08T00:00:00.000Z",
} = {}) {
  const immutableBytes = Buffer.from(bytes);
  const sha256 = sha256Hex(immutableBytes);
  const objectId = `object:${version_id}`;
  const receipt = await storage.putObject({ tenant_id: TENANT, object_id: objectId,
    bytes: immutableBytes, content_type: "text/plain" });
  await withPostgresTransaction(pool, { tenant_id: TENANT }, async (client) => {
    const fileObjectId = `file:${version_id}`;
    await client.query(
      `INSERT INTO lawos_dms.documents
         (tenant_id, document_id, matter_id, workspace_id, title, status,
          current_version_id, permission_envelope_id, audit_trace_id)
       VALUES ($1,$2,$3,$4,$5,'active',NULL,$6,$7)
       ON CONFLICT (tenant_id, document_id) DO NOTHING`,
      [TENANT, document_id, matter_id, `workspace:${matter_id}`, title,
        `permission:${document_id}`, `audit:${document_id}`],
    );
    await client.query(
      `INSERT INTO lawos_dms.file_objects
         (tenant_id, file_object_id, object_id, adapter_id, storage_pointer_ref,
          sha256, byte_size, content_type, status)
       VALUES ($1,$2,$3,$4,$5,$6,$7,'text/plain','committed')`,
      [TENANT, fileObjectId, objectId, storage.adapter_id,
        receipt.storage_pointer_ref, sha256, immutableBytes.byteLength],
    );
    await client.query(
      `INSERT INTO lawos_dms.document_versions
         (tenant_id, version_id, document_id, version_number, file_object_id,
          sha256, created_by)
       VALUES ($1,$2,$3,$4,$5,$6,$7)`,
      [TENANT, version_id, document_id, version_number, fileObjectId, sha256, ACTOR],
    );
    await client.query(
      `UPDATE lawos_dms.documents
          SET current_version_id = $3, updated_at = clock_timestamp()
        WHERE tenant_id = $1 AND document_id = $2`,
      [TENANT, document_id, version_id],
    );
  });
  await createDocumentPrivilegeRepository({ pool }).classifyDocumentPrivilege({
    tenant_id: TENANT, document_id, label_id: `privilege:${version_id}:cleared`,
    classification: "not_privileged", authority: "dms-privilege-review-v1",
    decision_id: `decision:${version_id}:cleared`,
    provenance_sha256: sha256Hex(Buffer.from(`privilege:${version_id}`)),
    applied_by: ACTOR, applied_at: privilege_applied_at });
}

function source({
  source_id,
  matter_id,
  document_id,
  version_id,
  title,
  body = `immutable precedent body for ${source_id}`,
  case_law = false,
} = {}) {
  return {
    tenant_id: TENANT,
    source_id,
    source_kind: case_law ? "case_law_document" : "internal_matter_document",
    matter_id,
    document_id,
    version_id,
    content_sha256: sha256Hex(Buffer.from(body, "utf8")),
    title,
    ...(case_law ? {
      court: "대법원",
      case_number: "2025다54321",
      decision_date: "2026-06-11",
      source_url: "https://glaw.scourt.go.kr/precedent/2025da54321",
      source_reference: "대법원 2026. 6. 11. 선고 2025다54321 판결",
    } : {}),
    actor_id: ACTOR,
    idempotency_key: `register:${source_id}`,
    approval_id: `approval:${source_id}`,
    approval_batch_id: "batch:outlook-precedent-api",
    approval_decision_id: `decision:${source_id}`,
    approval_authority: "vault-approved-precedent-corpus-v1",
    approved_by: ACTOR,
    approved_at: "2026-08-08T00:00:00.000Z",
  };
}

async function indexSource(repository, extractor, entry) {
  const extracted = await extractor.extractSource({ tenant_id: TENANT,
    source_id: entry.source.source_id, actor_id: ACTOR });
  return repository.indexSource({ tenant_id: TENANT,
    source_id: entry.source.source_id, actor_id: ACTOR,
    metadata_text: extracted.metadata_text, body_text: extracted.body_text,
    extraction_receipt: extracted.extraction_receipt });
}

function permissionContext({ denyMatter = false } = {}) {
  return {
    principal: {
      user_id: ACTOR,
      tenant_id: TENANT,
      role_ids: ["lawyer"],
    },
    rules: [
      { id: "allow-precedent-route", effect: "allow", action: "outlook:precedent:search" },
      { id: "allow-dms-read", effect: "allow", action: "dms:document:read" },
    ],
    object_acl: [
      {
        id: "ethical-wall-denied-source",
        principal_id: ACTOR,
        resource_id: "document_denied",
        action: "dms:document:read",
        effect: "deny",
      },
      ...(denyMatter ? [{
        id: "deny-current-matter",
        principal_id: ACTOR,
        resource_id: CURRENT_MATTER,
        action: "outlook:precedent:search",
        effect: "deny",
      }] : []),
    ],
  };
}

function matterRepository() {
  return {
    get({ tenant_id, model_type, matter_id }) {
      return tenant_id === TENANT && model_type === "Matter" && matter_id === CURRENT_MATTER
        ? { tenant_id, model_type, matter_id, status: "open" }
        : undefined;
    },
  };
}

async function request({ repository, context = permissionContext(), query = {}, requestId = "req_outlook_precedent" } = {}) {
  return handleOutlookAddinApiRequest({
    pathname: "/api/outlook/precedents",
    method: "GET",
    query: {
      q: "damages",
      matter_id: CURRENT_MATTER,
      ...query,
    },
    context,
    requestId,
    runtime: {
      matterRuntime: { repository: matterRepository() },
      precedentSearchRuntime: repository ? { repository } : null,
    },
  });
}

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
      source: source({
        source_id: "precedent_allowed_internal",
        matter_id: "matter_allowed_internal",
        document_id: "document_allowed_internal",
        version_id: "version_allowed_internal_1",
        title: "손해배상 내부 검토",
        body: "손해배상 범위와 fiduciary duty damages 분석",
      }),
      body: "손해배상 범위와 fiduciary duty damages 분석",
    },
    {
      source: source({
        source_id: "precedent_allowed_case",
        matter_id: "matter_allowed_case",
        document_id: "document_allowed_case",
        version_id: "version_allowed_case_1",
        title: "대법원 계약책임 판결",
        body: "fiduciary duty and contractual damages precedent",
        case_law: true,
      }),
      body: "fiduciary duty and contractual damages precedent",
    },
    {
      source: source({
        source_id: "precedent_denied",
        matter_id: "matter_denied",
        document_id: "document_denied",
        version_id: "version_denied_1",
        title: "damages damages damages",
        body: "denied raw body damages damages damages",
      }),
      body: "denied raw body damages damages damages",
    },
    {
      source: source({
        source_id: "precedent_current",
        matter_id: CURRENT_MATTER,
        document_id: "document_current",
        version_id: "version_current_1",
        title: "current matter damages",
        body: "current matter body damages",
      }),
      body: "current matter body damages",
    },
  ];
  for (const entry of fixtures) {
    await commitDocument(fixture.appPool, storage, {
      matter_id: entry.source.matter_id,
      document_id: entry.source.document_id,
      version_id: entry.source.version_id,
      bytes: entry.body,
      title: entry.source.title,
    });
    await repository.registerSource(entry.source);
    await indexSource(repository, extractor, entry);
  }

  const first = await request({ repository, query: { limit: "1" }, requestId: "req_precedent_page_1" });
  assert.equal(first.status, 200, JSON.stringify(first.body));
  assert.equal(first.body.items.length, 1);
  assert.equal(first.body.page_info.returned_count, 1);
  assert.equal(first.body.page_info.has_more, true);
  assert.ok(first.body.next_cursor);
  const second = await request({
    repository,
    query: { limit: "1", cursor: first.body.next_cursor },
    requestId: "req_precedent_page_2",
  });
  assert.equal(second.status, 200);
  assert.notEqual(second.body.items[0].source_id, first.body.items[0].source_id);
  const combined = [...first.body.items, ...second.body.items];
  assert.deepEqual(new Set(combined.map((item) => item.source_id)), new Set([
    "precedent_allowed_internal",
    "precedent_allowed_case",
  ]));
  const caseLaw = combined.find((item) => item.source_kind === "case_law_document");
  assert.equal(caseLaw.citation.case_number, "2025다54321");
  assert.match(caseLaw.source_url, /^https:\/\//u);
  const internal = combined.find((item) => item.source_kind === "internal_matter_document");
  assert.equal(internal.source_url,
    "?view=vault&document_id=document_allowed_internal#vault-search-documents");
  const serialized = JSON.stringify([first.body, second.body]);
  assert.doesNotMatch(serialized, /precedent_denied|precedent_current|denied raw body|opaque:/u);
  assert.doesNotMatch(serialized, /denied_count|omitted_count|total_count|body_text|storage_pointer_ref"/u);
  assert.equal(first.body.count_leak_prevented, true);
  assert.equal(first.body.raw_body_included, false);
  assert.equal(first.body.storage_pointer_ref_included, false);
  assert.equal(first.body.authoritative, true);

  const readiness = await handleOutlookAddinApiRequest({
    pathname: "/api/outlook/precedents/readiness",
    method: "GET",
    query: { matter_id: CURRENT_MATTER },
    context: permissionContext(),
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

  const korean = await request({
    repository,
    query: { q: "손해", limit: "20" },
    requestId: "req_precedent_korean",
  });
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
  const tenantMismatch = await request({
    repository,
    query: { tenant_id: "tenant_foreign" },
    requestId: "req_precedent_tenant",
  });
  assert.equal(tenantMismatch.status, 403);
  assert.deepEqual(tenantMismatch.body.safe_error_codes, ["OUTLOOK_PRECEDENT_TENANT_MISMATCH"]);
  const deniedMatter = await request({
    repository,
    context: permissionContext({ denyMatter: true }),
    requestId: "req_precedent_matter_denied",
  });
  assert.equal(deniedMatter.status, 403);
  assert.deepEqual(deniedMatter.body.safe_error_codes, ["OUTLOOK_PRECEDENT_PERMISSION_DENIED"]);
  const missingRuntime = await request({ repository: null, requestId: "req_precedent_unavailable" });
  assert.equal(missingRuntime.status, 503);
  assert.deepEqual(missingRuntime.body.safe_error_codes, ["OUTLOOK_PRECEDENT_RUNTIME_UNAVAILABLE"]);

  await commitDocument(fixture.appPool, storage, {
    matter_id: "matter_allowed_internal",
    document_id: "document_allowed_internal",
    version_id: "version_allowed_internal_2",
    version_number: 2,
    privilege_applied_at: "2026-08-08T02:00:00.000Z",
    bytes: "allowed replacement makes the authorized source stale",
    title: "손해배상 내부 검토 개정",
  });
  const stale = await request({ repository, requestId: "req_precedent_stale" });
  assert.equal(stale.status, 409);
  assert.deepEqual(stale.body.safe_error_codes, ["PRECEDENT_INDEX_STALE"]);
  assert.equal(JSON.stringify(stale.body).includes("document_allowed_internal"), false);
});
