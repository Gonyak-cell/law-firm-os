import assert from "node:assert/strict";
import test from "node:test";

import {
  CLIENT_OPERATIONS_SCHEMA_MANIFEST,
  readClientOperationsMigrationReadiness,
  readClientOperationsMigrationState,
  runClientOperationsMigration,
  selectClientOperationsReadPath,
} from "../src/client-operations-migration.js";
import {
  CLIENT_OPERATIONS_MODEL_REGISTRY,
} from "../src/client-operations-model-registry.js";
import {
  CLIENT_OPERATIONS_READINESS_KEY,
} from "../src/client-operations-readiness.js";
import {
  createDomainSnapshot,
  hashDomainValue,
} from "../../../packages/persistence/src/domain-ledger.js";
import {
  createPostgresDomainLedger,
} from "../../../packages/persistence/src/postgres/domain-ledger.js";
import {
  CLIENT_MIGRATION_TENANT,
  clientOperationSources,
  importClientDirectory,
  importHrxBaseline,
} from "./helpers/client-operations-migration-fixture.js";
import {
  createOutlookAuthorityPostgresFixture,
  runHistoricalHrxPostgresMigrations,
  runOutlookAuthorityPostgresMigrations,
} from "./support/outlook-authority-postgres-fixture.js";

const DOMAINS = Object.freeze(["crm", "finance", "email-dms"]);

async function storageState(fixture) {
  const readbackPool = fixture.bootstrapPool;
  const [records, imports, readiness] = await Promise.all([
    readbackPool.query(
      `SELECT domain_id, record_type, record_id,
              state_version, payload_hash
         FROM lawos_domain.records
        WHERE tenant_id = $1
          AND domain_id = ANY($2::text[])
        ORDER BY domain_id, record_type, record_id`,
      [CLIENT_MIGRATION_TENANT, DOMAINS],
    ),
    readbackPool.query(
      `SELECT domain_id, source_hash, snapshot_hash,
              source_count, target_count, status
         FROM lawos_domain.import_receipts
        WHERE tenant_id = $1
          AND domain_id = ANY($2::text[])
        ORDER BY domain_id, source_hash`,
      [CLIENT_MIGRATION_TENANT, DOMAINS],
    ),
    readbackPool.query(
      `SELECT domain_id, idempotency_key, request_hash,
              response
         FROM lawos_domain.idempotency_keys
        WHERE tenant_id = $1
          AND domain_id = 'analytics'
          AND idempotency_key = $2
        ORDER BY idempotency_key`,
      [CLIENT_MIGRATION_TENANT, CLIENT_OPERATIONS_READINESS_KEY],
    ),
  ]);
  return Object.freeze({
    record_count: records.rows.length,
    import_receipt_count: imports.rows.length,
    readiness_receipt_count: readiness.rows.length,
    digest: hashDomainValue({
      records: records.rows,
      imports: imports.rows,
      readiness: readiness.rows,
    }),
  });
}

test("invalid inputs do not write and partial migration recovers idempotently", async (t) => {
  const fixture = await createOutlookAuthorityPostgresFixture(t);
  if (!fixture) return;
  const readbackPool = fixture.bootstrapPool;
  await runHistoricalHrxPostgresMigrations(fixture.adminPool);
  await runOutlookAuthorityPostgresMigrations(fixture);
  const ledger = createPostgresDomainLedger({
    pool: fixture.appPool,
  });
  await importClientDirectory(ledger);
  await importHrxBaseline(ledger);
  const snapshots = clientOperationSources();
  const empty = await storageState(fixture);
  assert.deepEqual({
    record_count: empty.record_count,
    import_receipt_count: empty.import_receipt_count,
    readiness_receipt_count: empty.readiness_receipt_count,
  }, {
    record_count: 0,
    import_receipt_count: 0,
    readiness_receipt_count: 0,
  });

  let importAttempts = 0;
  const guardedLedger = {
    ...ledger,
    importSnapshot(snapshot) {
      importAttempts += 1;
      return ledger.importSnapshot(snapshot);
    },
  };
  await assert.rejects(
    runClientOperationsMigration({
      ledger: guardedLedger,
      pool: fixture.appPool,
      snapshots,
      tenant_id: " ",
    }),
    /tenant_id is required/u,
  );
  const invalidSnapshots = [
    snapshots[0],
    snapshots[1],
    {
      ...snapshots[2],
      snapshot_hash: "0".repeat(64),
    },
  ];
  await assert.rejects(
    runClientOperationsMigration({
      ledger: guardedLedger,
      pool: fixture.appPool,
      snapshots: invalidSnapshots,
      tenant_id: CLIENT_MIGRATION_TENANT,
    }),
    /snapshot digest/u,
  );
  assert.equal(importAttempts, 0);
  assert.deepEqual(await storageState(fixture), empty);

  const forgedPath = await selectClientOperationsReadPath({
    enabled: true,
    ledger,
    pool: fixture.appPool,
    tenant_id: CLIENT_MIGRATION_TENANT,
    readback: {
      verified: true,
      state_sha256: "f".repeat(64),
    },
  });
  assert.equal(forgedPath.active, false);
  assert.equal(forgedPath.caller_verification_accepted, false);
  assert.equal(
    forgedPath.reason,
    "postgres_migration_attestation_missing",
  );

  const interruptedLedger = {
    ...ledger,
    importSnapshot(snapshot) {
      if (snapshot.domain_id === "email-dms") {
        throw Object.assign(
          new Error("synthetic email-dms interruption"),
          { code: "SYNTHETIC_EMAIL_DMS_INTERRUPTION" },
        );
      }
      return ledger.importSnapshot(snapshot);
    },
  };
  await assert.rejects(
    runClientOperationsMigration({
      ledger: interruptedLedger,
      pool: fixture.appPool,
      snapshots,
      tenant_id: CLIENT_MIGRATION_TENANT,
    }),
    (error) =>
      error?.code === "SYNTHETIC_EMAIL_DMS_INTERRUPTION",
  );
  const partial = await readClientOperationsMigrationState({
    ledger,
    tenant_id: CLIENT_MIGRATION_TENANT,
  });
  assert.equal(partial.verified, false);
  assert.equal(partial.record_count, 10);
  assert.equal(
    (await selectClientOperationsReadPath({
      enabled: true,
      ledger,
      pool: fixture.appPool,
      tenant_id: CLIENT_MIGRATION_TENANT,
    })).read_path,
    "legacy-client-v1",
  );
  const partialStorage = await storageState(fixture);
  await assert.rejects(
    runClientOperationsMigration({
      ledger,
      pool: fixture.appPool,
      snapshots,
      tenant_id: "tenant_client_migration_wrong",
    }),
    /snapshot tenant/u,
  );
  assert.deepEqual(await storageState(fixture), partialStorage);

  const recovered = await runClientOperationsMigration({
    ledger,
    pool: fixture.appPool,
    snapshots,
    tenant_id: CLIENT_MIGRATION_TENANT,
  });
  assert.deepEqual(
    recovered.results.map(
      ({ domain_id, replayed }) => [domain_id, replayed],
    ),
    [
      ["crm", true],
      ["finance", true],
      ["email-dms", false],
    ],
  );
  assert.equal(recovered.readback.record_count, 14);
  assert.equal(
    recovered.readback.schema_migration_count,
    CLIENT_OPERATIONS_SCHEMA_MANIFEST.schema_migration_count,
  );
  assert.equal(
    recovered.readback.schema_sha256,
    CLIENT_OPERATIONS_SCHEMA_MANIFEST.schema_sha256,
  );
  const ready = await readClientOperationsMigrationReadiness({
    ledger,
    pool: fixture.appPool,
    tenant_id: CLIENT_MIGRATION_TENANT,
  });
  assert.equal(ready.verified, true);
  const recoveredStorage = await storageState(fixture);
  assert.deepEqual({
    record_count: recoveredStorage.record_count,
    import_receipt_count: recoveredStorage.import_receipt_count,
    readiness_receipt_count:
      recoveredStorage.readiness_receipt_count,
  }, {
    record_count: 14,
    import_receipt_count: 3,
    readiness_receipt_count: 1,
  });

  const persisted = await readbackPool.query(
    `SELECT domain_id, record_type, record_id,
            state_version, payload_hash
       FROM lawos_domain.records
      WHERE tenant_id = $1
        AND domain_id = ANY($2::text[])
      ORDER BY domain_id, record_type, record_id`,
    [CLIENT_MIGRATION_TENANT, DOMAINS],
  );
  assert.equal(
    await readbackPool.query(
      "SELECT to_regclass('lawos_domain.records')::text AS relation",
    ).then(({ rows }) => rows[0].relation),
    "lawos_domain.records",
  );
  for (const registryEntry of
    CLIENT_OPERATIONS_MODEL_REGISTRY.entries) {
    const tableRows = persisted.rows
      .filter((row) => (
        row.domain_id === registryEntry.domain_id
        && row.record_type === registryEntry.model_type
      ))
      .map((row) => ({
        record_id: row.record_id,
        state_version: Number(row.state_version),
        payload_hash: row.payload_hash,
      }));
    const readback = recovered.readback.models.find(
      ({ domain_id, model_type }) => (
        domain_id === registryEntry.domain_id
        && model_type === registryEntry.model_type
      ),
    );
    assert.ok(tableRows.length >= 1, registryEntry.model_type);
    assert.equal(readback.count, tableRows.length);
    assert.equal(readback.digest, hashDomainValue(tableRows));
  }
  assert.equal(
    persisted.rows.some(
      ({ record_type }) => record_type === "Proposal",
    ),
    false,
  );

  const rerun = await runClientOperationsMigration({
    ledger,
    pool: fixture.appPool,
    snapshots,
    tenant_id: CLIENT_MIGRATION_TENANT,
  });
  assert.equal(
    rerun.results.every(({ replayed }) => replayed === true),
    true,
  );
  assert.equal(
    rerun.readback.state_sha256,
    recovered.readback.state_sha256,
  );
  assert.equal(
    rerun.readback.schema_sha256,
    recovered.readback.schema_sha256,
  );
  assert.deepEqual(await storageState(fixture), recoveredStorage);

  const changedCrm = createDomainSnapshot({
    tenant_id: snapshots[0].tenant_id,
    domain_id: snapshots[0].domain_id,
    records: snapshots[0].records.map((record) => (
      record.record_type === "Lead"
        ? {
            ...record,
            payload: {
              ...record.payload,
              next_action: "변경된 합성 원본",
            },
          }
        : record
    )),
    idempotency_entries: snapshots[0].idempotency_entries,
    audit_events: snapshots[0].audit_events,
  });
  await assert.rejects(
    runClientOperationsMigration({
      ledger,
      pool: fixture.appPool,
      snapshots: [changedCrm, snapshots[1], snapshots[2]],
      tenant_id: CLIENT_MIGRATION_TENANT,
    }),
    (error) =>
      error?.code
        === "CLIENT_OPERATIONS_MIGRATION_READINESS_CONFLICT",
  );
  assert.deepEqual(await storageState(fixture), recoveredStorage);
});
