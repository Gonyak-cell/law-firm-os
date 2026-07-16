import assert from "node:assert/strict";
import test from "node:test";
import {
  compareDomainSnapshots,
  createDomainSnapshot,
  hashDomainValue,
} from "../src/domain-ledger.js";
import { createPostgresDomainLedger } from "../src/postgres/domain-ledger.js";
import { withPostgresTransaction } from "../src/postgres/transaction.js";
import { createMigratedPostgresFixture } from "./helpers/disposable-postgres.js";

const TENANT = "tenant-domain-ledger-a";
const OTHER_TENANT = "tenant-domain-ledger-b";
const DOMAIN = "matter";

function sourceSnapshot(tenantId = TENANT) {
  const records = [
    {
      tenant_id: tenantId,
      domain_id: DOMAIN,
      record_type: "Matter",
      record_id: "matter-001",
      unique_key: "M-2026-001",
      payload: { matter_code: "M-2026-001", status: "open" },
    },
    {
      tenant_id: tenantId,
      domain_id: DOMAIN,
      record_type: "MatterTimelineEvent",
      record_id: "timeline-001",
      append_only: true,
      payload: { event_kind: "opened", sequence: 1 },
      references: [
        {
          reference_name: "matter",
          target_domain_id: DOMAIN,
          target_record_type: "Matter",
          target_record_id: "matter-001",
        },
      ],
    },
  ];
  const idempotencyEntries = [{
    tenant_id: tenantId,
    domain_id: DOMAIN,
    idempotency_key: "matter-import-001",
    operation: "matter.import",
    response: { accepted: true },
  }];
  const auditEvents = [{
    tenant_id: tenantId,
    domain_id: DOMAIN,
    event_id: "audit-import-001",
    event_type: "matter.imported",
    object_type: "Matter",
    object_id: "matter-001",
    payload: { imported_record_count: 2 },
  }];
  return createDomainSnapshot({
    tenant_id: tenantId,
    domain_id: DOMAIN,
    records,
    idempotency_entries: idempotencyEntries,
    audit_events: auditEvents,
    source_hash: hashDomainValue({
      tenant_id: tenantId,
      source: "synthetic-matter-file-v2",
      records,
      idempotency_entries: idempotencyEntries,
      audit_events: auditEvents,
    }),
  });
}

test("domain snapshot contract fixes hashes, uniqueness, references and PII-safe comparison", () => {
  const source = sourceSnapshot();
  const same = createDomainSnapshot(source);
  assert.equal(source.snapshot_hash, same.snapshot_hash);
  assert.equal(source.invariant_summary.record_count, 2);
  assert.equal(source.invariant_summary.reference_count, 1);
  assert.equal(source.invariant_summary.idempotency_count, 1);
  assert.equal(source.invariant_summary.audit_event_count, 1);
  assert.equal(compareDomainSnapshots(source, same).equal, true);

  assert.throws(
    () => createDomainSnapshot({
      tenant_id: TENANT,
      domain_id: DOMAIN,
      records: [
        ...source.records,
        { ...source.records[0], record_id: "matter-002" },
      ],
    }),
    /duplicate domain unique key/u,
  );
  assert.throws(
    () => createDomainSnapshot({
      tenant_id: TENANT,
      domain_id: DOMAIN,
      records: [
        {
          ...source.records[1],
          references: [{
            reference_name: "missing",
            target_domain_id: DOMAIN,
            target_record_type: "Matter",
            target_record_id: "missing",
          }],
        },
      ],
    }),
    /orphan domain reference/u,
  );
});

test("PostgreSQL domain ledger imports idempotently, compares shadow state and records only source-ready rehearsal", async (t) => {
  const fixture = await createMigratedPostgresFixture(t);
  if (!fixture) return;
  const ledger = createPostgresDomainLedger({ pool: fixture.appPool, clock: () => new Date("2026-07-16T17:00:00.000Z") });
  const source = sourceSnapshot();

  const imported = await ledger.importSnapshot(source);
  assert.equal(imported.replayed, false);
  assert.equal(imported.receipt.source_count, 2);
  assert.equal(imported.receipt.target_count, 2);
  assert.equal(imported.receipt.rejected_count, 0);
  assert.equal(imported.receipt.rollback_cutoff, "pre_authority");
  assert.equal(JSON.stringify(imported.receipt).includes("M-2026-001"), false);

  const replay = await ledger.importSnapshot(source);
  assert.equal(replay.replayed, true);
  assert.equal(replay.receipt.receipt_id, imported.receipt.receipt_id);

  const shadow = await ledger.compareSnapshot(source);
  assert.equal(shadow.comparison.equal, true);
  assert.equal(shadow.receipt.status, "equal");
  assert.equal(shadow.receipt.difference_count, 0);
  const rehearsal = await ledger.recordRehearsal({
    tenant_id: TENANT,
    domain_id: DOMAIN,
    import_receipt_id: imported.receipt.receipt_id,
    shadow_receipt_id: shadow.receipt.receipt_id,
    smoke_result: { api_contract_unchanged: true, adapter: "postgres-v2" },
  });
  assert.equal(rehearsal.status, "source_ready");
  assert.equal(rehearsal.production_migrated, false);

  await ledger.write({
    ...source.records[0],
    expected_version: 1,
    payload: { matter_code: "M-2026-001", status: "changed-after-import" },
  });
  const differentShadow = await ledger.compareSnapshot(source);
  assert.equal(differentShadow.receipt.status, "different");
  await assert.rejects(
    ledger.recordRehearsal({
      tenant_id: TENANT,
      domain_id: DOMAIN,
      import_receipt_id: imported.receipt.receipt_id,
      shadow_receipt_id: differentShadow.receipt.receipt_id,
      smoke_result: { api_contract_unchanged: false },
    }),
    (error) => error?.code === "LAWOS_DOMAIN_IMPORT_CONFLICT",
  );

  await ledger.importSnapshot(sourceSnapshot(OTHER_TENANT));
  assert.equal((await ledger.list({ tenant_id: TENANT, domain_id: DOMAIN })).length, 2);
  await withPostgresTransaction(fixture.appPool, { tenant_id: TENANT }, async (client) => {
    const hidden = await client.query(
      "SELECT record_id FROM lawos_domain.records WHERE tenant_id = $1",
      [OTHER_TENANT],
    );
    assert.deepEqual(hidden.rows, []);
  });
});

test("PostgreSQL domain ledger enforces conflict, append-only, FK, rollback, idempotency and secret-free audit", async (t) => {
  const fixture = await createMigratedPostgresFixture(t);
  if (!fixture) return;
  const ledger = createPostgresDomainLedger({ pool: fixture.appPool, clock: () => new Date("2026-07-16T17:30:00.000Z") });
  const source = sourceSnapshot();
  await ledger.importSnapshot(source);

  await assert.rejects(
    ledger.write({
      ...source.records[0],
      expected_version: 0,
      payload: { matter_code: "M-2026-001", status: "stale" },
    }),
    (error) => error?.code === "LAWOS_REPOSITORY_CONFLICT" && error?.status === 409,
  );
  await assert.rejects(
    ledger.write({
      ...source.records[1],
      expected_version: 1,
      payload: { event_kind: "tampered", sequence: 1 },
    }),
  );

  const requestHash = hashDomainValue({ operation: "matter.open", matter_id: "matter-001" });
  const firstClaim = await ledger.claimIdempotency({
    tenant_id: TENANT,
    domain_id: DOMAIN,
    key: "matter-open-001",
    request_hash: requestHash,
    response: { accepted: true },
  });
  const replay = await ledger.claimIdempotency({
    tenant_id: TENANT,
    domain_id: DOMAIN,
    key: "matter-open-001",
    request_hash: requestHash,
    response: { ignored: true },
  });
  assert.equal(firstClaim.replayed, false);
  assert.equal(replay.replayed, true);
  assert.deepEqual(replay.record.response, { accepted: true });
  await assert.rejects(
    ledger.claimIdempotency({
      tenant_id: TENANT,
      domain_id: DOMAIN,
      key: "matter-open-001",
      request_hash: hashDomainValue({ operation: "different" }),
    }),
    (error) => error?.code === "LAWOS_IDEMPOTENCY_CONFLICT",
  );

  await assert.rejects(
    ledger.appendAudit({
      tenant_id: TENANT,
      domain_id: DOMAIN,
      event_id: "audit-secret-rejected",
      event_type: "matter.secret",
      payload: { session_token: "must-not-persist" },
    }),
    /sensitive evidence field/u,
  );
  await ledger.appendAudit({
    tenant_id: TENANT,
    domain_id: DOMAIN,
    event_id: "audit-matter-opened",
    event_type: "matter.opened",
    object_type: "Matter",
    object_id: "matter-001",
    payload: { state_version: 1 },
  });

  await assert.rejects(
    ledger.transaction({ tenant_id: TENANT, domain_id: DOMAIN }, async (tx) => {
      await tx.write({
        tenant_id: TENANT,
        domain_id: DOMAIN,
        record_type: "Matter",
        record_id: "matter-rollback",
        expected_version: 0,
        payload: { matter_code: "M-ROLLBACK" },
      });
      throw new Error("synthetic domain rollback");
    }),
    /synthetic domain rollback/u,
  );
  assert.equal(await ledger.read({
    tenant_id: TENANT,
    domain_id: DOMAIN,
    record_type: "Matter",
    record_id: "matter-rollback",
  }), undefined);

  await assert.rejects(
    withPostgresTransaction(fixture.appPool, { tenant_id: TENANT }, (client) => client.query(
      `INSERT INTO lawos_domain.record_references
         (tenant_id, source_domain_id, source_record_type, source_record_id,
          reference_name, target_domain_id, target_record_type, target_record_id)
       VALUES ($1, $2, 'Matter', 'matter-001', 'missing', $2, 'Matter', 'missing')`,
      [TENANT, DOMAIN],
    )),
  );
  await assert.rejects(
    fixture.adminPool.query(
      `UPDATE lawos_domain.audit_events
          SET event_type = 'tampered'
        WHERE tenant_id = $1 AND domain_id = $2 AND event_id = 'audit-matter-opened'`,
      [TENANT, DOMAIN],
    ),
  );
});
