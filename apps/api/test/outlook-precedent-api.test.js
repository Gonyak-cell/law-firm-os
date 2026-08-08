import assert from "node:assert/strict";
import test from "node:test";
import {
  OUTLOOK_ADDIN_BOUNDED_CONTEXT,
  handleOutlookAddinApiRequest,
} from "../src/outlook-addin-runtime-context.js";
import { createPostgresPrecedentRepository } from "../../../packages/dms/src/search/postgres-precedent-repository.js";
import { createMigratedPostgresFixture } from "../../../packages/persistence/test/helpers/disposable-postgres.js";
import { withPostgresTransaction } from "../../../packages/persistence/src/postgres/transaction.js";

const TENANT = "tenant_outlook_precedent";
const ACTOR = "user_outlook_precedent";
const CURRENT_MATTER = "matter_current";

function digest(character) {
  return character.repeat(64);
}

async function commitDocument(pool, {
  matter_id,
  document_id,
  version_id,
  sha256,
  title,
  version_number = 1,
} = {}) {
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
       VALUES ($1,$2,$3,'precedent-api-test',$4,$5,100,'text/plain','committed')`,
      [TENANT, fileObjectId, `object:${version_id}`, `opaque:${version_id}`, sha256],
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
}

function source({
  source_id,
  matter_id,
  document_id,
  version_id,
  content_sha256,
  title,
  case_law = false,
} = {}) {
  return {
    tenant_id: TENANT,
    source_id,
    source_kind: case_law ? "case_law_document" : "internal_matter_document",
    matter_id,
    document_id,
    version_id,
    content_sha256,
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
  };
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
      permission_ref: "permission_outlook_precedent",
      audit_hint_ref: "audit_outlook_precedent",
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
  const fixture = await createMigratedPostgresFixture(t);
  if (!fixture) return;
  const repository = createPostgresPrecedentRepository({ pool: fixture.appPool });
  const fixtures = [
    {
      source: source({
        source_id: "precedent_allowed_internal",
        matter_id: "matter_allowed_internal",
        document_id: "document_allowed_internal",
        version_id: "version_allowed_internal_1",
        content_sha256: digest("a"),
        title: "손해배상 내부 검토",
      }),
      metadata: "contract damages",
      body: "손해배상 범위와 fiduciary duty damages 분석",
    },
    {
      source: source({
        source_id: "precedent_allowed_case",
        matter_id: "matter_allowed_case",
        document_id: "document_allowed_case",
        version_id: "version_allowed_case_1",
        content_sha256: digest("b"),
        title: "대법원 계약책임 판결",
        case_law: true,
      }),
      metadata: "Supreme Court damages",
      body: "fiduciary duty and contractual damages precedent",
    },
    {
      source: source({
        source_id: "precedent_denied",
        matter_id: "matter_denied",
        document_id: "document_denied",
        version_id: "version_denied_1",
        content_sha256: digest("c"),
        title: "damages damages damages",
      }),
      metadata: "damages damages",
      body: "denied raw body damages damages damages",
    },
    {
      source: source({
        source_id: "precedent_current",
        matter_id: CURRENT_MATTER,
        document_id: "document_current",
        version_id: "version_current_1",
        content_sha256: digest("d"),
        title: "current matter damages",
      }),
      metadata: "damages",
      body: "current matter body damages",
    },
  ];
  for (const entry of fixtures) {
    await commitDocument(fixture.appPool, {
      matter_id: entry.source.matter_id,
      document_id: entry.source.document_id,
      version_id: entry.source.version_id,
      sha256: entry.source.content_sha256,
      title: entry.source.title,
    });
    await repository.registerSource(entry.source);
    await repository.indexSource({
      tenant_id: TENANT,
      source_id: entry.source.source_id,
      actor_id: ACTOR,
      metadata_text: entry.metadata,
      body_text: entry.body,
    });
  }

  const first = await request({ repository, query: { limit: "1" }, requestId: "req_precedent_page_1" });
  assert.equal(first.status, 200);
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
  const serialized = JSON.stringify([first.body, second.body]);
  assert.doesNotMatch(serialized, /precedent_denied|precedent_current|denied raw body|opaque:/u);
  assert.doesNotMatch(serialized, /denied_count|omitted_count|total_count|body_text|storage_pointer_ref"/u);
  assert.equal(first.body.count_leak_prevented, true);
  assert.equal(first.body.raw_body_included, false);
  assert.equal(first.body.storage_pointer_ref_included, false);

  const korean = await request({
    repository,
    query: { q: "손해", limit: "20" },
    requestId: "req_precedent_korean",
  });
  assert.equal(korean.status, 200);
  assert.deepEqual(korean.body.items.map((item) => item.source_id), ["precedent_allowed_internal"]);

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

  await commitDocument(fixture.appPool, {
    matter_id: "matter_allowed_internal",
    document_id: "document_allowed_internal",
    version_id: "version_allowed_internal_2",
    version_number: 2,
    sha256: digest("e"),
    title: "손해배상 내부 검토 개정",
  });
  const stale = await request({ repository, requestId: "req_precedent_stale" });
  assert.equal(stale.status, 409);
  assert.deepEqual(stale.body.safe_error_codes, ["PRECEDENT_INDEX_STALE"]);
  assert.equal(JSON.stringify(stale.body).includes("document_allowed_internal"), false);
});
