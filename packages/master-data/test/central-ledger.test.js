import assert from "node:assert/strict";
import test from "node:test";
import { MASTER_DATA_RUNTIME_SEED } from "../../../apps/api/src/master-data-context.js";
import { CRM_MASTER_DATA_SEED } from "../../../apps/api/src/crm-intake-runtime-context.js";
import {
  createRecordRepositoryDomainSnapshot,
  runRecordRepositoryDomainCommand,
} from "../../persistence/src/record-domain-adapter.js";
import { createPostgresDomainLedger } from "../../persistence/src/postgres/domain-ledger.js";
import { createMigratedPostgresFixture } from "../../persistence/test/helpers/disposable-postgres.js";
import { reportDomainReceiptEvidence } from "../../persistence/test/helpers/domain-receipt-evidence.js";
import { MASTER_DATA_DOMAIN_DESCRIPTOR } from "../src/central-ledger.js";
import { createMasterDataRepository } from "../src/repository.js";

const TENANT = "tenant_cmp_g6_synthetic";

function sourceRepositories() {
  return [
    {
      source_id: "canonical-master-data",
      repository: createMasterDataRepository({ seedRecords: MASTER_DATA_RUNTIME_SEED.records }),
    },
    {
      source_id: "crm-master-data",
      repository: createMasterDataRepository({ seedRecords: CRM_MASTER_DATA_SEED }),
    },
  ];
}

test("Master Data central-ledger inventory fixes IDs, references, uniqueness, PII names and source conflicts", () => {
  const repositories = sourceRepositories();
  try {
    const result = createRecordRepositoryDomainSnapshot({
      descriptor: MASTER_DATA_DOMAIN_DESCRIPTOR,
      repositories,
      tenant_id: TENANT,
    });
    assert.equal(result.inventory.source_ids.length, 2);
    assert.equal(result.inventory.canonical_record_count, 10);
    assert.equal(result.inventory.tenant_mismatch_count, 0);
    assert.equal(result.inventory.pii_field_names.includes("identifier_value"), true);
    assert.deepEqual(result.snapshot.invariant_summary.record_type_counts, {
      ClientGroup: 1,
      ContactPoint: 1,
      Entity: 2,
      Organization: 1,
      Party: 2,
      PartyIdentifier: 1,
      Person: 1,
      Relationship: 1,
    });

    const conflicting = createMasterDataRepository({
      seedRecords: [{ ...CRM_MASTER_DATA_SEED[0], display_name: "Conflicting source value" }],
    });
    assert.throws(
      () => createRecordRepositoryDomainSnapshot({
        descriptor: MASTER_DATA_DOMAIN_DESCRIPTOR,
        repositories: [repositories[1], { source_id: "conflict", repository: conflicting }],
        tenant_id: TENANT,
      }),
      (error) => error?.safe_error_code === "DOMAIN_SOURCE_CONFLICT",
    );
    conflicting.close();
  } finally {
    for (const { repository } of repositories) repository.close();
  }
});

test("Master Data PostgreSQL import, replay, shadow and async command rehearsal preserve the repository contract", async (t) => {
  const fixture = await createMigratedPostgresFixture(t);
  if (!fixture) return;
  const ledger = createPostgresDomainLedger({
    pool: fixture.appPool,
    clock: () => new Date("2026-07-16T18:00:00.000Z"),
  });
  const repositories = sourceRepositories();
  const source = createRecordRepositoryDomainSnapshot({
    descriptor: MASTER_DATA_DOMAIN_DESCRIPTOR,
    repositories,
    tenant_id: TENANT,
  }).snapshot;
  for (const { repository } of repositories) repository.close();

  const imported = await ledger.importSnapshot(source);
  assert.equal(imported.replayed, false);
  assert.equal(imported.receipt.rejected_count, 0);
  const secondImport = await ledger.importSnapshot(source);
  assert.equal(secondImport.replayed, true);
  const shadow = await ledger.compareSnapshot(source);
  assert.equal(shadow.comparison.equal, true);
  const rehearsal = await ledger.recordRehearsal({
    tenant_id: TENANT,
    domain_id: MASTER_DATA_DOMAIN_DESCRIPTOR.domain_id,
    import_receipt_id: imported.receipt.receipt_id,
    shadow_receipt_id: shadow.receipt.receipt_id,
    smoke_result: {
      status: "passed",
      synthetic_only: true,
      environment: "test",
      adapter: "master-data-postgres-domain-ledger",
      executed_at: "2026-07-16T17:30:00.000Z",
      source_snapshot_hash: shadow.comparison.source_hash,
      checks: {
        source_imported: imported.receipt.status === "source_imported",
        idempotency_replayed: secondImport.replayed,
        shadow_equal: shadow.comparison.equal,
        readback_equal: shadow.comparison.source_hash === shadow.comparison.target_hash,
        json_dual_write_absent: true,
      },
      production_migrated: false,
    },
  });

  const entity = source.records.find((record) => record.record_type === "Entity");
  const command = await runRecordRepositoryDomainCommand({
    ledger,
    descriptor: MASTER_DATA_DOMAIN_DESCRIPTOR,
    tenant_id: TENANT,
    create_repository: createMasterDataRepository,
    command(repository) {
      return repository.transaction((tx) => {
        const updated = tx.update(
          { tenant_id: TENANT, model_type: "Entity", entity_id: entity.record_id },
          { display_name: "Central ledger rehearsal entity" },
        );
        tx.recordIdempotency({
          tenant_id: TENANT,
          idempotency_key: "master-data-central-ledger-update-001",
          operation: "master_data_central_ledger_update",
          response: { entity_id: entity.record_id, outcome: "updated" },
        });
        tx.appendAudit({
          tenant_id: TENANT,
          event_id: "master-data:central-ledger:update:001",
          action: "master-data.central-ledger.update",
          actor_id: "user_rs_dom_rehearsal",
          object_type: "Entity",
          object_id: entity.record_id,
          metadata: { changed_field_count: 1 },
        });
        return updated;
      });
    },
  });
  assert.equal(command.result.display_name, "Central ledger rehearsal entity");
  assert.equal(command.flush.comparison.equal, true);

  assert.equal(rehearsal.status, "source_ready");
  assert.equal(rehearsal.production_migrated, false);
  reportDomainReceiptEvidence({ source, imported, secondImport, shadow, rehearsal });
});
