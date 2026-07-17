import assert from "node:assert/strict";
import test from "node:test";
import { VAULT_DMS_RUNTIME_SEED } from "../../../apps/api/src/vault-dms-runtime-context.js";
import { createPostgresDomainLedger } from "../../persistence/src/postgres/domain-ledger.js";
import { createMigratedPostgresFixture } from "../../persistence/test/helpers/disposable-postgres.js";
import { reportDomainReceiptEvidence } from "../../persistence/test/helpers/domain-receipt-evidence.js";
import {
  createDmsDomainSnapshot,
  createDmsRepository,
  DMS_DOMAIN_DESCRIPTOR,
  runDmsPostgresCommand,
} from "../src/index.js";

const TENANT = VAULT_DMS_RUNTIME_SEED[0].tenant_id;

function sourceRepository() {
  return createDmsRepository({ seedRecords: VAULT_DMS_RUNTIME_SEED });
}

test("DMS central-ledger inventory fixes version, object, reference, PII and byte-persistence invariants", () => {
  const repository = sourceRepository();
  try {
    const result = createDmsDomainSnapshot({
      repositories: [{ source_id: "dms-file-v2", repository }],
      tenant_id: TENANT,
    });
    assert.equal(DMS_DOMAIN_DESCRIPTOR.domain_id, "dms");
    assert.equal(result.inventory.canonical_record_count, 4);
    assert.equal(result.inventory.tenant_mismatch_count, 0);
    assert.equal(result.inventory.unique_rules.includes("DmsDocumentVersion.document_id+version_number"), true);
    assert.equal(result.inventory.reference_rules.includes("DmsDocumentVersion.file_object_id->DmsFileObject"), true);
    assert.equal(result.inventory.pii_field_names.includes("title"), true);
    assert.equal(result.inventory.blocked_persisted_field_count, 0);
    assert.equal(result.inventory.production_migrated, false);
  } finally {
    repository.close();
  }

  assert.throws(
    () => createDmsRepository({ seedRecords: [{
      model_type: "DmsFileObject",
      file_object_id: "unsafe-file",
      tenant_id: TENANT,
      matter_id: "matter-rp05-synthetic-opening",
      storage_pointer_ref: "vault://local/unsafe",
      sha256: "unsafe-fixture",
      byte_size: 0,
      mime_type: "application/octet-stream",
      permission_envelope_id: "permission-unsafe-fixture",
      audit_trace_id: "trace-unsafe-fixture",
      raw_bytes: "not-allowed",
    }] }),
    (error) => error?.safe_error_code === "DMS_PERSISTED_SECRET_REJECTED",
  );
});

test("DMS PostgreSQL snapshot/shadow preserve source while mutable lawos_domain commands fail closed", async (t) => {
  const fixture = await createMigratedPostgresFixture(t);
  if (!fixture) return;
  const ledger = createPostgresDomainLedger({
    pool: fixture.appPool,
    clock: () => new Date("2026-07-16T06:00:00.000Z"),
  });
  const repository = sourceRepository();
  const source = createDmsDomainSnapshot({
    repositories: [{ source_id: "dms-file-v2", repository }],
    tenant_id: TENANT,
  }).snapshot;
  repository.close();

  const imported = await ledger.importSnapshot(source);
  const replay = await ledger.importSnapshot(source);
  const shadow = await ledger.compareSnapshot(source);
  assert.equal(imported.replayed, false);
  assert.equal(replay.replayed, true);
  assert.equal(shadow.comparison.equal, true);

  await assert.rejects(
    runDmsPostgresCommand({ ledger, tenant_id: TENANT, command() {} }),
    (error) => error?.safe_error_code === "DMS_DOMAIN_LEDGER_MUTABLE_WRITE_REJECTED",
  );

  const rehearsal = await ledger.recordRehearsal({
    tenant_id: TENANT,
    domain_id: "dms",
    import_receipt_id: imported.receipt.receipt_id,
    shadow_receipt_id: shadow.receipt.receipt_id,
    smoke_result: {
      adapter: "dms-postgres-domain-ledger",
      source_import_equal: true,
      mutable_domain_ledger_write_rejected: true,
      upload_runtime_source_verified: true,
      production_migrated: false,
    },
  });
  assert.equal(rehearsal.status, "source_ready");
  assert.equal(rehearsal.production_migrated, false);
  reportDomainReceiptEvidence({ source, imported, secondImport: replay, shadow, rehearsal });
});
