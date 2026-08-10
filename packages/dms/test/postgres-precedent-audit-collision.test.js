import assert from "node:assert/strict";
import test from "node:test";
import { createMigratedPostgresFixture } from "../../persistence/test/helpers/disposable-postgres.js";
import { withPostgresTransaction } from "../../persistence/src/postgres/transaction.js";
import { hashValue } from "../src/search/precedent-common.js";
import { createLocalStorageAdapter } from "../src/storage/local-storage-adapter.js";
import {
  ACTOR,
  OTHER_TENANT,
  TENANT,
  commitDocument,
  digest,
  extractor,
  index,
  repository,
  searchInput,
  source,
} from "./precedent-test-helpers.js";

async function auditRows(pool, tenantId, occurrenceId) {
  return withPostgresTransaction(pool, { tenant_id: tenantId, readOnly: true },
    async (client) => (await client.query(
      `SELECT event_id,event_type,actor_id,object_type,object_id,payload
         FROM lawos_dms.audit_events
        WHERE tenant_id=$1 AND event_type='dms.precedent_source.searched'
          AND payload->>'request_occurrence_id'=$2
        ORDER BY event_id`, [tenantId, occurrenceId])).rows);
}

async function seedCollision(pool, { tenant_id: tenantId, event_id: eventId }) {
  return withPostgresTransaction(pool, { tenant_id: tenantId }, async (client) => (
    await client.query(
      `INSERT INTO lawos_dms.audit_events
         (tenant_id,event_id,event_type,actor_id,object_type,object_id,payload)
       VALUES ($1,$2,'dms.precedent_source.collision','actor-collision',
               'PrecedentSource','source-collision',$3::jsonb)
       RETURNING *`, [tenantId, eventId, JSON.stringify({ collision: true })])
  ).rows[0]);
}

async function auditById(pool, tenantId, eventId) {
  return withPostgresTransaction(pool, { tenant_id: tenantId, readOnly: true },
    async (client) => (await client.query(
      "SELECT * FROM lawos_dms.audit_events WHERE tenant_id=$1 AND event_id=$2",
      [tenantId, eventId])).rows[0]);
}

test("search audit binds occurrence, tenant, actor, matter, query, authority, cursor, and result", async (t) => {
  const fixture = await createMigratedPostgresFixture(t);
  if (!fixture) return;
  const occurrence = "request:audit-complete-binding";
  const repo = repository(fixture.appPool);
  const storage = createLocalStorageAdapter({ adapter_id: "precedent-audit-search" });
  const extraction = extractor(fixture.appPool, storage);
  const entries = ["a", "b"].map((suffix) => source({
    source_id: `source-audit-search-${suffix}`,
    matter_id: `matter-audit-search-${suffix}`,
    document_id: `document-audit-search-${suffix}`,
    version_id: `version-audit-search-${suffix}`,
    title: `손해 fiduciary ${suffix}`,
    body: `손해 fiduciary immutable result ${suffix}`,
  }));
  for (const entry of entries) {
    await commitDocument(fixture.appPool, storage, entry);
    await repo.registerSource(entry);
    await index(repo, extraction, entry);
  }
  const firstInput = searchInput({ request_occurrence_id: occurrence,
    allowed_document_ids: entries.map(({ document_id }) => document_id),
    query: "손해 fiduciary", limit: 1 });
  const first = await repo.search(firstInput);
  assert.equal(first.items.length, 1);
  assert.ok(first.next_cursor);
  const secondInput = { ...firstInput, cursor: first.next_cursor };
  const second = await repo.search(secondInput);
  assert.equal(second.items.length, 1);
  assert.equal(second.next_cursor, null);
  await repo.search(secondInput);
  await repo.search({ ...firstInput, authorization_decision_sha256: digest("f") });
  await repo.search({ ...firstInput, authorized_source_set_sha256: digest("a") });
  await repo.search(searchInput({ request_occurrence_id: occurrence,
    allowed_document_ids: entries.map(({ document_id }) => document_id),
    actor_id: "actor-precedent-other",
    matter_id: "matter-precedent-other", query: "계약 책임" }));
  await repo.search(searchInput({ tenant_id: OTHER_TENANT,
    request_occurrence_id: occurrence, allowed_document_ids: [], query: "손해 fiduciary" }));

  const tenantRows = await auditRows(fixture.appPool, TENANT, occurrence);
  const otherTenantRows = await auditRows(fixture.appPool, OTHER_TENANT, occurrence);
  assert.equal(tenantRows.length, 5);
  assert.equal(new Set(tenantRows.map(({ event_id }) => event_id)).size, 5);
  assert.equal(new Set(tenantRows.map(({ payload }) => payload.authorization_decision_sha256)).size, 2);
  assert.equal(new Set(tenantRows.map(({ payload }) => payload.authorized_source_set_sha256)).size, 2);
  assert.equal(tenantRows.filter(({ payload }) => payload.input_cursor_sha256).length, 1);
  assert.equal(tenantRows.filter(({ payload }) => payload.output_cursor_sha256).length, 3);
  assert.equal(new Set(tenantRows.map(({ payload }) => payload.returned_source_set_sha256)).size, 3);
  assert.deepEqual([...new Set(tenantRows.map(({ payload }) => payload.returned_count))].sort(), [0, 1]);
  assert.equal(otherTenantRows.length, 1);
  for (const row of [...tenantRows, ...otherTenantRows]) {
    assert.equal(row.object_type, "PrecedentSource");
    assert.equal(row.payload.raw_body_included, false);
    assert.equal(row.payload.document_bytes_included, false);
    assert.equal(row.payload.storage_pointer_ref_included, false);
    assert.equal(JSON.stringify(row.payload).includes("손해 fiduciary"), false);
    assert.equal(JSON.stringify(row.payload).includes("계약 책임"), false);
  }

  await repository(fixture.appPool).search(secondInput);
  assert.equal((await auditRows(fixture.appPool, TENANT, occurrence)).length, 5);
});

test("register audit collision fails closed and rolls back source and idempotency writes", async (t) => {
  const fixture = await createMigratedPostgresFixture(t);
  if (!fixture) return;
  const storage = createLocalStorageAdapter({ adapter_id: "precedent-audit-register" });
  const entry = source({ source_id: "source-audit-register", matter_id: "matter-audit-register",
    document_id: "document-audit-register", version_id: "version-audit-register",
    title: "audit register collision" });
  await commitDocument(fixture.appPool, storage, entry);
  const eventId = `audit:precedent-register:${hashValue({ idempotency_key: entry.idempotency_key })}`;
  const seeded = await seedCollision(fixture.appPool, { tenant_id: TENANT, event_id: eventId });
  await assert.rejects(repository(fixture.appPool).registerSource(entry),
    (error) => error.safe_error_code === "PRECEDENT_AUDIT_COLLISION");
  assert.deepEqual(await auditById(fixture.appPool, TENANT, eventId), seeded);
  const state = await withPostgresTransaction(fixture.appPool,
    { tenant_id: TENANT, readOnly: true }, (client) => client.query(
      `SELECT
         (SELECT count(*)::int FROM lawos_dms.precedent_sources WHERE tenant_id=$1 AND source_id=$2) AS sources,
         (SELECT count(*)::int FROM lawos_dms.idempotency_keys WHERE tenant_id=$1 AND idempotency_key=$3) AS receipts`,
      [TENANT, entry.source_id, entry.idempotency_key]));
  assert.deepEqual(state.rows[0], { sources: 0, receipts: 0 });
});

test("disable and unapprove audit collisions fail closed and preserve active sources", async (t) => {
  const fixture = await createMigratedPostgresFixture(t);
  if (!fixture) return;
  const storage = createLocalStorageAdapter({ adapter_id: "precedent-audit-transition" });
  const repo = repository(fixture.appPool);
  const cases = ["disabled", "unapproved"].map((status) => ({ status,
    key: `transition-audit:${status}`,
    entry: source({ source_id: `source-audit-${status}`, matter_id: `matter-audit-${status}`,
      document_id: `document-audit-${status}`, version_id: `version-audit-${status}`,
      title: `audit ${status} collision` }) }));
  for (const { entry } of cases) {
    await commitDocument(fixture.appPool, storage, entry);
    await repo.registerSource(entry);
  }
  for (const item of cases) {
    item.event_id = `audit:precedent-${item.status}:${hashValue({ idempotency_key: item.key })}`;
    await seedCollision(fixture.appPool, { tenant_id: TENANT, event_id: item.event_id });
  }
  const outcomes = await Promise.allSettled(cases.map(({ status, key, entry }) => (
    status === "disabled" ? repo.disableSource({ tenant_id: TENANT,
      source_id: entry.source_id, actor_id: ACTOR, idempotency_key: key })
      : repo.unapproveSource({ tenant_id: TENANT,
        source_id: entry.source_id, actor_id: ACTOR, idempotency_key: key })
  )));
  assert.deepEqual(outcomes.map(({ status, reason }) => [status, reason?.safe_error_code]), [
    ["rejected", "PRECEDENT_AUDIT_COLLISION"],
    ["rejected", "PRECEDENT_AUDIT_COLLISION"],
  ]);
  const rows = await withPostgresTransaction(fixture.appPool,
    { tenant_id: TENANT, readOnly: true }, async (client) => (await client.query(
      "SELECT source_id,status FROM lawos_dms.precedent_sources WHERE tenant_id=$1 AND source_id=ANY($2::text[]) ORDER BY source_id",
      [TENANT, cases.map(({ entry }) => entry.source_id)])).rows);
  assert.equal(rows.every(({ status }) => status === "active"), true);
});

test("registry exact retry is idempotent and differing request hash fails before audit", async (t) => {
  const fixture = await createMigratedPostgresFixture(t);
  if (!fixture) return;
  const storage = createLocalStorageAdapter({ adapter_id: "precedent-audit-idempotency" });
  const entry = source({ source_id: "source-audit-idempotency", matter_id: "matter-audit-idempotency",
    document_id: "document-audit-idempotency", version_id: "version-audit-idempotency",
    title: "audit idempotency" });
  await commitDocument(fixture.appPool, storage, entry);
  const repo = repository(fixture.appPool);
  await repo.registerSource(entry);
  assert.equal((await repo.registerSource(entry)).replayed, true);
  await assert.rejects(repo.registerSource({ ...entry, actor_id: "actor-different" }),
    (error) => error.safe_error_code === "PRECEDENT_IDEMPOTENCY_CONFLICT");
  const eventId = `audit:precedent-register:${hashValue({ idempotency_key: entry.idempotency_key })}`;
  assert.ok(await auditById(fixture.appPool, TENANT, eventId));
});
