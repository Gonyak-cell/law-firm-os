import assert from "node:assert/strict";
import test from "node:test";
import { MATTER_RUNTIME_SEED } from "../../../apps/api/src/matter-runtime-context.js";
import {
  createRecordRepositoryDomainSnapshot,
  runRecordRepositoryDomainCommand,
} from "../../persistence/src/record-domain-adapter.js";
import { createPostgresDomainLedger } from "../../persistence/src/postgres/domain-ledger.js";
import { createMigratedPostgresFixture } from "../../persistence/test/helpers/disposable-postgres.js";
import { reportDomainReceiptEvidence } from "../../persistence/test/helpers/domain-receipt-evidence.js";
import { MATTER_DOMAIN_DESCRIPTOR } from "../src/central-ledger.js";
import { createMatterRepository } from "../src/repository.js";

const TENANT = "tenant_rp05_synthetic";

function sourceRepository() {
  return createMatterRepository({ seedRecords: MATTER_RUNTIME_SEED.records });
}

test("Matter central-ledger inventory fixes model, relationship, uniqueness and append-only invariants", () => {
  const repository = sourceRepository();
  try {
    const result = createRecordRepositoryDomainSnapshot({
      descriptor: MATTER_DOMAIN_DESCRIPTOR,
      repositories: [{ source_id: "matter-file-v2", repository }],
      tenant_id: TENANT,
    });
    assert.equal(result.inventory.canonical_record_count, 405);
    assert.equal(result.inventory.tenant_mismatch_count, 0);
    assert.equal(result.inventory.optional_missing_reference_count, 1);
    assert.equal(result.inventory.unique_rules.includes("Matter.matter_code"), true);
    assert.equal(result.inventory.reference_rules.includes("*.matter_id->Matter"), true);
    assert.equal(result.inventory.pii_field_names.includes("title"), true);
  } finally {
    repository.close();
  }
});

test("OUTM-21 correction projections are append-only and retain both Matter authorities", () => {
  for (const model_type of ["EmailFilingPlacementEvent", "EmailFilingPlacementReference"]) {
    const record = {
      model_type,
      matter_id: "matter-target",
      source_matter_id: "matter-source",
      target_matter_id: "matter-target",
    };
    assert.equal(MATTER_DOMAIN_DESCRIPTOR.append_only(record), true);
    assert.deepEqual(
      MATTER_DOMAIN_DESCRIPTOR.references(record)
        .filter((reference) => reference.reference_name.endsWith("_matter"))
        .map((reference) => ({
          reference_name: reference.reference_name,
          target_record_id: reference.target_record_id,
          required: reference.required,
        })),
      [
        {
          reference_name: "source_matter",
          target_record_id: "matter-source",
          required: true,
        },
        {
          reference_name: "target_matter",
          target_record_id: "matter-target",
          required: true,
        },
      ],
    );
  }
});

test("Matter PostgreSQL import, idempotency, audit and async update rehearsal preserve exact readback", async (t) => {
  const fixture = await createMigratedPostgresFixture(t);
  if (!fixture) return;
  const ledger = createPostgresDomainLedger({
    pool: fixture.appPool,
    clock: () => new Date("2026-07-16T18:10:00.000Z"),
  });
  const repository = sourceRepository();
  const source = createRecordRepositoryDomainSnapshot({
    descriptor: MATTER_DOMAIN_DESCRIPTOR,
    repositories: [{ source_id: "matter-file-v2", repository }],
    tenant_id: TENANT,
  }).snapshot;
  repository.close();

  const imported = await ledger.importSnapshot(source);
  assert.equal(imported.replayed, false);
  const secondImport = await ledger.importSnapshot(source);
  assert.equal(secondImport.replayed, true);
  const shadow = await ledger.compareSnapshot(source);
  assert.equal(shadow.comparison.equal, true);
  const rehearsal = await ledger.recordRehearsal({
    tenant_id: TENANT,
    domain_id: "matter",
    import_receipt_id: imported.receipt.receipt_id,
    shadow_receipt_id: shadow.receipt.receipt_id,
    smoke_result: {
      status: "passed",
      synthetic_only: true,
      environment: "test",
      adapter: "matter-postgres-domain-ledger",
      executed_at: "2026-07-16T18:00:00.000Z",
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
  const matter = source.records.find((record) => record.record_type === "Matter");
  const command = await runRecordRepositoryDomainCommand({
    ledger,
    descriptor: MATTER_DOMAIN_DESCRIPTOR,
    tenant_id: TENANT,
    create_repository: createMatterRepository,
    command(materialized) {
      return materialized.transaction((tx) => {
        const updated = tx.update(
          { tenant_id: TENANT, model_type: "Matter", matter_id: matter.record_id },
          { title: "PostgreSQL source rehearsal matter" },
        );
        tx.recordIdempotency({
          tenant_id: TENANT,
          idempotency_key: "matter-central-ledger-update-001",
          operation: "matter_central_ledger_update",
          response: { matter_id: matter.record_id, outcome: "updated" },
        });
        tx.appendAudit({
          tenant_id: TENANT,
          event_id: "matter:central-ledger:update:001",
          action: "matter.central-ledger.update",
          actor_id: "user_rs_dom_rehearsal",
          object_type: "Matter",
          object_id: matter.record_id,
          metadata: { changed_field_count: 1 },
        });
        return updated;
      });
    },
  });
  assert.equal(command.result.title, "PostgreSQL source rehearsal matter");
  assert.equal(command.flush.comparison.equal, true);
  assert.equal((await ledger.listIdempotency({ tenant_id: TENANT, domain_id: "matter" })).length, 1);
  assert.equal((await ledger.listAudit({ tenant_id: TENANT, domain_id: "matter" })).length, 1);

  assert.equal(rehearsal.status, "source_ready");
  assert.equal(rehearsal.production_migrated, false);
  reportDomainReceiptEvidence({ source, imported, secondImport, shadow, rehearsal });
});
