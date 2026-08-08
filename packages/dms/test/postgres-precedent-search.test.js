import assert from "node:assert/strict";
import test from "node:test";
import { createMigratedPostgresFixture } from "../../persistence/test/helpers/disposable-postgres.js";
import { withPostgresTransaction } from "../../persistence/src/postgres/transaction.js";
import {
  createPrecedentCorpusService,
  importApprovedPrecedentSources,
} from "../src/precedent-source.js";
import {
  createPostgresPrecedentRepository,
  PRECEDENT_INDEX_VERSION,
} from "../src/search/postgres-precedent-repository.js";

const TENANT = "tenant_precedent_alpha";
const OTHER_TENANT = "tenant_precedent_beta";
const ACTOR = "user_precedent_editor";

function digest(character) {
  return character.repeat(64);
}

async function commitDocument(pool, {
  tenant_id = TENANT,
  matter_id,
  document_id,
  version_id,
  sha256,
  title,
  version_number = 1,
} = {}) {
  await withPostgresTransaction(pool, { tenant_id }, async (client) => {
    const fileObjectId = `file:${version_id}`;
    const objectId = `object:${version_id}`;
    await client.query(
      `INSERT INTO lawos_dms.documents
         (tenant_id, document_id, matter_id, workspace_id, title, status,
          current_version_id, permission_envelope_id, audit_trace_id)
       VALUES ($1,$2,$3,$4,$5,'active',NULL,$6,$7)
       ON CONFLICT (tenant_id, document_id) DO NOTHING`,
      [tenant_id, document_id, matter_id, `workspace:${matter_id}`, title,
        `permission:${document_id}`, `audit:${document_id}`],
    );
    await client.query(
      `INSERT INTO lawos_dms.file_objects
         (tenant_id, file_object_id, object_id, adapter_id, storage_pointer_ref,
          sha256, byte_size, content_type, status)
       VALUES ($1,$2,$3,'precedent-test',$4,$5,100,'text/plain','committed')`,
      [tenant_id, fileObjectId, objectId, `opaque:${version_id}`, sha256],
    );
    await client.query(
      `INSERT INTO lawos_dms.document_versions
         (tenant_id, version_id, document_id, version_number, file_object_id,
          sha256, created_by)
       VALUES ($1,$2,$3,$4,$5,$6,$7)`,
      [tenant_id, version_id, document_id, version_number, fileObjectId, sha256, ACTOR],
    );
    await client.query(
      `UPDATE lawos_dms.documents
          SET current_version_id = $3, updated_at = clock_timestamp()
        WHERE tenant_id = $1 AND document_id = $2`,
      [tenant_id, document_id, version_id],
    );
  });
}

function internalSource({
  source_id,
  matter_id,
  document_id,
  version_id,
  content_sha256,
  title,
  tenant_id = TENANT,
  actor_id = ACTOR,
  idempotency_key = `register:${source_id}`,
} = {}) {
  return {
    tenant_id,
    source_id,
    source_kind: "internal_matter_document",
    matter_id,
    document_id,
    version_id,
    content_sha256,
    title,
    actor_id,
    idempotency_key,
  };
}

function caseLawSource(input = {}) {
  return {
    ...internalSource(input),
    source_kind: "case_law_document",
    court: "대법원",
    case_number: "2024다12345",
    decision_date: "2026-05-14",
    source_url: "https://glaw.scourt.go.kr/precedent/2024da12345",
    source_reference: "대법원 2026. 5. 14. 선고 2024다12345 판결",
  };
}

test("approved precedent registry and index stay current, audited, idempotent, and tenant isolated", async (t) => {
  const fixture = await createMigratedPostgresFixture(t);
  if (!fixture) return;
  const repository = createPostgresPrecedentRepository({ pool: fixture.appPool });
  const authorizationCalls = [];
  const service = createPrecedentCorpusService({
    repository,
    authorize(input) {
      authorizationCalls.push(input);
      return { effect: "allow" };
    },
  });
  await commitDocument(fixture.appPool, {
    matter_id: "matter_internal_a",
    document_id: "document_internal_a",
    version_id: "version_internal_a_1",
    sha256: digest("a"),
    title: "손해배상 검토 메모",
  });
  await commitDocument(fixture.appPool, {
    matter_id: "matter_case_a",
    document_id: "document_case_a",
    version_id: "version_case_a_1",
    sha256: digest("b"),
    title: "대법원 손해배상 판결",
  });
  await commitDocument(fixture.appPool, {
    tenant_id: OTHER_TENANT,
    matter_id: "matter_foreign",
    document_id: "document_foreign",
    version_id: "version_foreign_1",
    sha256: digest("c"),
    title: "Foreign precedent",
  });

  const internal = internalSource({
    source_id: "precedent_internal_a",
    matter_id: "matter_internal_a",
    document_id: "document_internal_a",
    version_id: "version_internal_a_1",
    content_sha256: digest("a"),
    title: "손해배상 검토 메모",
  });
  const registered = await service.register(internal);
  assert.equal(registered.source.source_revision, 1);
  assert.equal(registered.index_stale, true);
  assert.equal(authorizationCalls[0].action, "dms:precedent:source:register");
  const replay = await service.register(internal);
  assert.equal(replay.replayed, true);
  await assert.rejects(
    service.register({ ...internal, title: "changed title with same key" }),
    (error) => error?.safe_error_code === "PRECEDENT_IDEMPOTENCY_CONFLICT",
  );
  await assert.rejects(
    service.register({
      ...caseLawSource({
        source_id: "bad_case",
        matter_id: "matter_case_a",
        document_id: "document_case_a",
        version_id: "version_case_a_1",
        content_sha256: digest("b"),
        title: "Bad case",
      }),
      court: null,
    }),
    /case_law_document requires/u,
  );

  const imported = await importApprovedPrecedentSources({
    service,
    batch_id: "approved_batch_1",
    sources: [caseLawSource({
      source_id: "precedent_case_a",
      matter_id: "matter_case_a",
      document_id: "document_case_a",
      version_id: "version_case_a_1",
      content_sha256: digest("b"),
      title: "대법원 손해배상 판결",
      actor_id: ACTOR,
    })],
  });
  assert.deepEqual(imported.source_ids, ["precedent_case_a"]);
  await assert.rejects(
    importApprovedPrecedentSources({
      service,
      batch_id: "approved_batch_duplicates",
      sources: [internal, internal],
    }),
    /duplicate source_id/u,
  );

  const beforeIndex = await repository.readiness({
    tenant_id: TENANT,
    allowed_document_ids: ["document_internal_a", "document_case_a"],
  });
  assert.equal(beforeIndex.runtime_ready, false);
  assert.equal(beforeIndex.safe_error_code, "PRECEDENT_INDEX_STALE");

  const indexed = await repository.indexSource({
    tenant_id: TENANT,
    source_id: "precedent_internal_a",
    actor_id: ACTOR,
    metadata_text: "계약 불이행 손해배상",
    body_text: "피고의 손해배상책임과 손해액 산정에 관한 내부 검토입니다.",
  });
  const indexReplay = await repository.indexSource({
    tenant_id: TENANT,
    source_id: "precedent_internal_a",
    actor_id: ACTOR,
    metadata_text: "계약 불이행 손해배상",
    body_text: "피고의 손해배상책임과 손해액 산정에 관한 내부 검토입니다.",
  });
  assert.equal(indexReplay.replayed, true);
  assert.equal(indexReplay.indexed_at, indexed.indexed_at);
  await repository.indexSource({
    tenant_id: TENANT,
    source_id: "precedent_case_a",
    actor_id: ACTOR,
    metadata_text: "대법원 2024다12345 2026-05-14",
    body_text: "채무불이행에 따른 손해배상책임의 범위를 판단한 판결입니다.",
  });

  const restartedRepository = createPostgresPrecedentRepository({ pool: fixture.appPool });
  assert.equal((await restartedRepository.readiness({
    tenant_id: TENANT,
    allowed_document_ids: ["document_internal_a", "document_case_a"],
  })).runtime_ready, true);
  assert.deepEqual(
    (await restartedRepository.listSourceDescriptors({ tenant_id: OTHER_TENANT })).map((row) => row.document_id),
    [],
  );
  const audit = await withPostgresTransaction(fixture.appPool, { tenant_id: TENANT, readOnly: true }, async (client) => (
    client.query(
      `SELECT event_type, payload FROM lawos_dms.audit_events
        WHERE tenant_id = $1 AND event_type LIKE 'dms.precedent_source.%'
        ORDER BY event_type`,
      [TENANT],
    )
  ));
  assert.ok(audit.rows.some((row) => row.event_type === "dms.precedent_source.registered"));
  assert.ok(audit.rows.some((row) => row.event_type === "dms.precedent_source.indexed"));
  assert.equal(JSON.stringify(audit.rows).includes("storage_pointer_ref"), true);
  assert.equal(JSON.stringify(audit.rows).includes("피고의"), false);

  await commitDocument(fixture.appPool, {
    matter_id: "matter_internal_a",
    document_id: "document_internal_a",
    version_id: "version_internal_a_2",
    version_number: 2,
    sha256: digest("d"),
    title: "손해배상 검토 메모 개정",
  });
  const replaced = await service.register({
    ...internal,
    version_id: "version_internal_a_2",
    content_sha256: digest("d"),
    title: "손해배상 검토 메모 개정",
    idempotency_key: "register:precedent_internal_a:v2",
  });
  assert.equal(replaced.source.source_revision, 2);
  assert.equal((await restartedRepository.readiness({
    tenant_id: TENANT,
    allowed_document_ids: ["document_internal_a"],
  })).runtime_ready, false);
  await restartedRepository.indexSource({
    tenant_id: TENANT,
    source_id: "precedent_internal_a",
    actor_id: ACTOR,
    metadata_text: "개정된 손해배상 검토",
    body_text: "개정된 현재 버전만 검색됩니다.",
  });
  assert.equal((await restartedRepository.readiness({
    tenant_id: TENANT,
    allowed_document_ids: ["document_internal_a"],
  })).runtime_ready, true);

  const disabled = await service.disable({
    tenant_id: TENANT,
    source_id: "precedent_case_a",
    actor_id: ACTOR,
    idempotency_key: "disable:precedent_case_a",
  });
  assert.equal(disabled.source.status, "disabled");
  assert.equal((await service.disable({
    tenant_id: TENANT,
    source_id: "precedent_case_a",
    actor_id: ACTOR,
    idempotency_key: "disable:precedent_case_a",
  })).replayed, true);
});

test("PostgreSQL precedent search filters permission candidates before rank and paginates a stable cited snapshot", async (t) => {
  const fixture = await createMigratedPostgresFixture(t);
  if (!fixture) return;
  const repository = createPostgresPrecedentRepository({ pool: fixture.appPool });
  const sources = [
    {
      source: internalSource({
        source_id: "precedent_allowed_1",
        matter_id: "matter_source_1",
        document_id: "document_allowed_1",
        version_id: "version_allowed_1",
        content_sha256: digest("1"),
        title: "손해배상책임 내부 검토",
      }),
      metadata: "계약 책임 damages",
      body: "손해배상책임의 범위와 fiduciary duty damages 분석",
    },
    {
      source: caseLawSource({
        source_id: "precedent_allowed_2",
        matter_id: "matter_source_2",
        document_id: "document_allowed_2",
        version_id: "version_allowed_2",
        content_sha256: digest("2"),
        title: "대법원 계약책임 판결",
        idempotency_key: "register:allowed:2",
      }),
      metadata: "대법원 damages",
      body: "fiduciary duty and contractual damages precedent",
    },
    {
      source: internalSource({
        source_id: "precedent_denied",
        matter_id: "matter_denied",
        document_id: "document_denied",
        version_id: "version_denied",
        content_sha256: digest("3"),
        title: "손해배상 손해배상 손해배상",
      }),
      metadata: "손해배상",
      body: "손해배상 손해배상 손해배상 denied raw body",
    },
    {
      source: internalSource({
        source_id: "precedent_current_matter",
        matter_id: "matter_current",
        document_id: "document_current",
        version_id: "version_current",
        content_sha256: digest("4"),
        title: "손해배상 현재 Matter 문서",
      }),
      metadata: "손해배상",
      body: "손해배상 current matter",
    },
  ];
  for (const entry of sources) {
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

  const allowed = ["document_allowed_1", "document_allowed_2", "document_current"];
  const korean = await repository.search({
    tenant_id: TENANT,
    matter_id: "matter_current",
    actor_id: ACTOR,
    audit_hint_ref: "audit_korean_search",
    permission_decision_id: "decision_korean_search",
    query: "손해",
    allowed_document_ids: allowed,
    limit: 20,
  });
  assert.deepEqual(korean.items.map((item) => item.source_id), ["precedent_allowed_1"]);
  assert.equal(JSON.stringify(korean).includes("precedent_denied"), false);
  assert.equal(JSON.stringify(korean).includes("denied raw body"), false);
  assert.equal(Object.hasOwn(korean, "total_count"), false);
  assert.equal(korean.count_leak_prevented, true);
  assert.equal(korean.items[0].raw_body_included, false);
  assert.equal(korean.items[0].storage_pointer_ref_included, false);

  const english1 = await repository.search({
    tenant_id: TENANT,
    matter_id: "matter_current",
    actor_id: ACTOR,
    audit_hint_ref: "audit_english_search_1",
    permission_decision_id: "decision_english_search_1",
    query: "fiduciary duty",
    allowed_document_ids: allowed,
    limit: 20,
  });
  const english2 = await repository.search({
    tenant_id: TENANT,
    matter_id: "matter_current",
    actor_id: ACTOR,
    audit_hint_ref: "audit_english_search_2",
    permission_decision_id: "decision_english_search_2",
    query: "fiduciary duty",
    allowed_document_ids: allowed,
    limit: 20,
  });
  assert.deepEqual(english1.items.map((item) => item.source_id), english2.items.map((item) => item.source_id));
  assert.equal(english1.items.find((item) => item.source_kind === "case_law_document")?.citation.case_number, "2024다12345");
  assert.equal(english1.items.every((item) => item.index_version === PRECEDENT_INDEX_VERSION), true);

  const page1 = await repository.search({
    tenant_id: TENANT,
    matter_id: "matter_current",
    actor_id: ACTOR,
    audit_hint_ref: "audit_page_1",
    permission_decision_id: "decision_page_1",
    query: "damages",
    allowed_document_ids: allowed,
    limit: 1,
  });
  assert.ok(page1.next_cursor);
  const page2 = await repository.search({
    tenant_id: TENANT,
    matter_id: "matter_current",
    actor_id: ACTOR,
    audit_hint_ref: "audit_page_2",
    permission_decision_id: "decision_page_2",
    query: "damages",
    allowed_document_ids: allowed,
    limit: 1,
    cursor: page1.next_cursor,
  });
  assert.notEqual(page2.items[0].source_id, page1.items[0].source_id);
  await assert.rejects(
    repository.search({
      tenant_id: TENANT,
      matter_id: "matter_current",
      actor_id: ACTOR,
      audit_hint_ref: "audit_stale_cursor",
      permission_decision_id: "decision_stale_cursor",
      query: "different query",
      allowed_document_ids: allowed,
      cursor: page1.next_cursor,
    }),
    (error) => error?.safe_error_code === "PRECEDENT_CURSOR_STALE",
  );
  await assert.rejects(
    repository.search({
      tenant_id: TENANT,
      matter_id: "matter_current",
      actor_id: ACTOR,
      audit_hint_ref: "audit_injection",
      permission_decision_id: "decision_injection",
      query: "x'; DROP TABLE lawos_dms.precedent_sources; --",
      allowed_document_ids: allowed,
    }),
    /unsupported SQL control text/u,
  );

  const currentIncluded = await repository.search({
    tenant_id: TENANT,
    matter_id: "matter_current",
    actor_id: ACTOR,
    audit_hint_ref: "audit_current_document_search",
    permission_decision_id: "decision_current_document_search",
    query: "current matter",
    allowed_document_ids: allowed,
    include_current_matter: true,
    search_mode: "document_search",
  });
  assert.deepEqual(currentIncluded.items.map((item) => item.source_id), ["precedent_current_matter"]);
  await assert.rejects(
    repository.search({
      tenant_id: TENANT,
      matter_id: "matter_current",
      actor_id: ACTOR,
      audit_hint_ref: "audit_bad_current_override",
      permission_decision_id: "decision_bad_current_override",
      query: "current matter",
      allowed_document_ids: allowed,
      include_current_matter: true,
    }),
    /document_search/u,
  );

  await withPostgresTransaction(fixture.appPool, { tenant_id: TENANT }, async (client) => {
    await client.query(
      `INSERT INTO lawos_dms.documents
         (tenant_id, document_id, matter_id, workspace_id, title, status,
          current_version_id, permission_envelope_id, audit_trace_id)
       SELECT $1, 'document_explain_' || value, 'matter_explain_' || value,
              'workspace_explain_' || value, 'neutral corpus row ' || value,
              'active', NULL, 'permission_explain_' || value,
              'audit_explain_' || value
         FROM generate_series(1, 1000) AS value`,
      [TENANT],
    );
    await client.query(
      `INSERT INTO lawos_dms.file_objects
         (tenant_id, file_object_id, object_id, adapter_id, storage_pointer_ref,
          sha256, byte_size, content_type, status)
       SELECT $1, 'file_explain_' || value, 'object_explain_' || value,
              'precedent-test', 'opaque:explain:' || value,
              md5(value::text) || md5(value::text), 10, 'text/plain', 'committed'
         FROM generate_series(1, 1000) AS value`,
      [TENANT],
    );
    await client.query(
      `INSERT INTO lawos_dms.document_versions
         (tenant_id, version_id, document_id, version_number, file_object_id,
          sha256, created_by)
       SELECT $1, 'version_explain_' || value, 'document_explain_' || value,
              1, 'file_explain_' || value,
              md5(value::text) || md5(value::text), $2
         FROM generate_series(1, 1000) AS value`,
      [TENANT, ACTOR],
    );
    await client.query(
      `UPDATE lawos_dms.documents
          SET current_version_id = replace(document_id, 'document_', 'version_')
        WHERE tenant_id = $1 AND document_id LIKE 'document_explain_%'`,
      [TENANT],
    );
    await client.query(
      `INSERT INTO lawos_dms.precedent_sources
         (tenant_id, source_id, source_kind, matter_id, document_id, version_id,
          content_sha256, title, registered_by, updated_by)
       SELECT $1, 'precedent_explain_' || value, 'internal_matter_document',
              'matter_explain_' || value, 'document_explain_' || value,
              'version_explain_' || value, md5(value::text) || md5(value::text),
              'neutral corpus row ' || value, $2, $2
         FROM generate_series(1, 1000) AS value`,
      [TENANT, ACTOR],
    );
    await client.query(
      `INSERT INTO lawos_dms.precedent_search_index
         (tenant_id, source_id, source_revision, document_id, version_id,
          content_sha256, index_version, index_hash, title_text, metadata_text,
          body_text, normalized_text)
       SELECT $1, 'precedent_explain_' || value, 1,
              'document_explain_' || value, 'version_explain_' || value,
              md5(value::text) || md5(value::text), $2,
              md5(('index:' || value)::text) || md5(('index:' || value)::text),
              'neutral corpus row ' || value, '', '',
              'neutral corpus row ' || value
         FROM generate_series(1, 1000) AS value`,
      [TENANT, PRECEDENT_INDEX_VERSION],
    );
  });
  await fixture.adminPool.query("ANALYZE lawos_dms.precedent_search_index");
  const adminClient = await fixture.adminPool.connect();
  try {
    await adminClient.query("BEGIN");
    await adminClient.query("SET LOCAL enable_seqscan = off");
    await adminClient.query("SET LOCAL enable_indexscan = off");
    const ftsPlan = await adminClient.query(
      `EXPLAIN (FORMAT JSON, COSTS OFF)
       SELECT source_id FROM lawos_dms.precedent_search_index
        WHERE search_vector @@ plainto_tsquery('simple', $1)`,
      ["fiduciary"],
    );
    const fallbackPlan = await adminClient.query(
      `EXPLAIN (FORMAT JSON, COSTS OFF)
       SELECT source_id FROM lawos_dms.precedent_search_index
        WHERE normalized_text ILIKE '%' || $1 || '%'`,
      ["손해배"],
    );
    const plans = JSON.stringify([ftsPlan.rows, fallbackPlan.rows]);
    assert.match(plans, /dms_precedent_search_vector_gin/u);
    assert.match(plans, /dms_precedent_search_korean_fallback_gin/u);
    await adminClient.query("ROLLBACK");
  } finally {
    adminClient.release();
  }
});
