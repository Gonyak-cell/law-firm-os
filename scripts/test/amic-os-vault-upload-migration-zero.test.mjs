import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { isDeepStrictEqual } from "node:util";

import {
  deriveVaultQuarantineReference,
  validateAmicOsVaultUploadMigrationZero,
} from "../validate-amic-os-vault-upload-migration-zero.mjs";

const request = Object.freeze({
  operation_id: "vaultop_0123456789abcdef0123456789abcdef",
  correlation_id: "vaultcorr_0123456789abcdef0123456789abcdef",
  request_fingerprint: "b".repeat(64),
  tenant_id: "11111111-1111-4111-8111-111111111111",
  actor_id: "22222222-2222-4222-8222-222222222222",
  matter_id: "33333333-3333-4333-8333-333333333333",
  operation_kind: "save_local_file",
  sha256: "a".repeat(64),
  byte_size: 4,
  mime_type: "application/pdf",
  original_filename: "proof.pdf",
  normalized_filename: "proof.pdf",
  source_system: "upload",
  document_fields: Object.freeze({ title: "Migration zero proof" }),
});

function conflict() {
  const error = new Error("VAULT_OPERATION_IDEMPOTENCY_CONFLICT");
  error.code = "VAULT_OPERATION_IDEMPOTENCY_CONFLICT";
  return error;
}

function exactObjectMaterial(input) {
  return Object.freeze({
    sha256: input.sha256,
    byte_size: input.byte_size,
    mime_type: input.mime_type,
  });
}

function exactOwnerMaterial(input) {
  return Object.freeze({
    operation_id: input.operation_id,
    correlation_id: input.correlation_id,
    request_fingerprint: input.request_fingerprint,
    tenant_id: input.tenant_id,
    actor_id: input.actor_id,
    matter_id: input.matter_id,
    operation_kind: input.operation_kind,
    sha256: input.sha256,
    byte_size: input.byte_size,
    mime_type: input.mime_type,
    original_filename: input.original_filename,
    normalized_filename: input.normalized_filename,
    source_system: input.source_system,
    document_fields: structuredClone(input.document_fields),
  });
}

class MigrationZeroSchemaModel {
  constructor(snapshot = {}) {
    this.objects = new Map(structuredClone(snapshot.objects ?? []));
    this.rows = new Map(structuredClone(snapshot.rows ?? []));
    this.jobs = new Set(structuredClone(snapshot.jobs ?? []));
    this.promotions = new Map(structuredClone(snapshot.promotions ?? []));
  }

  snapshot() {
    return structuredClone({
      objects: [...this.objects],
      rows: [...this.rows],
      jobs: [...this.jobs],
      promotions: [...this.promotions],
    });
  }

  accept(input, { crashAfterObject = false, forcedReference } = {}) {
    const quarantineRef = forcedReference ?? deriveVaultQuarantineReference(input.operation_id);
    const ownerMaterial = exactOwnerMaterial(input);
    const objectMaterial = exactObjectMaterial(input);
    const existing = this.rows.get(quarantineRef);
    if (existing) {
      if (!isDeepStrictEqual(existing.owner, ownerMaterial)
          || existing.audit.action !== "FILE_QUARANTINED"
          || existing.audit.correlation_id !== input.correlation_id
          || existing.audit.request_id !== input.request_fingerprint
          || existing.audit.hash !== input.sha256) {
        throw conflict();
      }
      return Object.freeze({ outcome: "replay", quarantine_ref: quarantineRef });
    }

    const existingObject = this.objects.get(quarantineRef);
    if (existingObject && !isDeepStrictEqual(existingObject, objectMaterial)) throw conflict();
    if (!existingObject) this.objects.set(quarantineRef, objectMaterial);
    if (crashAfterObject) throw new Error("SIMULATED_CRASH_AFTER_OBJECT");

    this.rows.set(quarantineRef, {
      scan_id: `scan:${quarantineRef}`,
      state: "quarantined",
      owner: ownerMaterial,
      audit: {
        action: "FILE_QUARANTINED",
        correlation_id: input.correlation_id,
        request_id: input.request_fingerprint,
        hash: input.sha256,
      },
    });
    this.jobs.add(quarantineRef);
    return Object.freeze({ outcome: "accepted", quarantine_ref: quarantineRef });
  }

  promote(input, exactVersion, { forcedReference } = {}) {
    const quarantineRef = forcedReference ?? deriveVaultQuarantineReference(input.operation_id);
    const row = this.rows.get(quarantineRef);
    if (!row || !isDeepStrictEqual(row.owner, exactOwnerMaterial(input))) throw conflict();
    if (row.audit.correlation_id !== input.correlation_id
        || row.audit.request_id !== input.request_fingerprint
        || row.audit.hash !== input.sha256) {
      throw conflict();
    }
    const expected = exactObjectMaterial(input);
    if (exactVersion.sha256 !== expected.sha256
        || exactVersion.byte_size !== expected.byte_size
        || exactVersion.mime_type !== expected.mime_type) {
      throw new Error("VAULT_OPERATION_EXACT_VERSION_MISMATCH");
    }
    const existing = this.promotions.get(quarantineRef);
    if (existing) {
      if (!isDeepStrictEqual(existing, exactVersion)) {
        throw new Error("VAULT_OPERATION_EXACT_VERSION_MISMATCH");
      }
      return Object.freeze({ outcome: "promotion_replay", exact_version: existing });
    }
    row.state = "promoted";
    this.promotions.set(quarantineRef, structuredClone(exactVersion));
    return Object.freeze({ outcome: "promoted", exact_version: exactVersion });
  }
}

test("migration-zero receipt validates without claiming a provider or live database", async () => {
  const result = await validateAmicOsVaultUploadMigrationZero();
  assert.deepEqual(result, {
    schema_version: "law-firm-os.amic-os-vault-upload-migration-zero-validation.v1",
    database_migration_required: false,
    vault_database_migration_count: 0,
    successor_provider_source_change_required: true,
    provider_ready: false,
    production_ready_claim: false,
    proof_case_count: 5,
    negative_case_count: 6,
    source_receipt_count: 15,
    live_source_verified: false,
  });
});

test("validator rejects provider-readiness and reversible-mapping overclaims", async () => {
  const contract = JSON.parse(await readFile(
    new URL("../../contracts/amic-os-vault-upload-migration-zero.json", import.meta.url),
    "utf8",
  ));
  await assert.rejects(
    validateAmicOsVaultUploadMigrationZero({
      contractOverride: { ...contract, decision: { ...contract.decision, provider_ready: true } },
    }),
    /cannot claim provider or production readiness/iu,
  );
  await assert.rejects(
    validateAmicOsVaultUploadMigrationZero({
      contractOverride: {
        ...contract,
        operation_mapping: { ...contract.operation_mapping, reversible: true },
      },
    }),
    /must be opaque and non-reversible/iu,
  );
});

test("validator rejects a pinned Vault source-receipt hash drift", async () => {
  const contract = JSON.parse(await readFile(
    new URL("../../contracts/amic-os-vault-upload-migration-zero.json", import.meta.url),
    "utf8",
  ));
  const [first, ...rest] = contract.source_receipt;
  await assert.rejects(
    validateAmicOsVaultUploadMigrationZero({
      contractOverride: {
        ...contract,
        source_receipt: [{ ...first, sha256: "not-a-sha256" }, ...rest],
      },
    }),
    /source receipt hash/iu,
  );
});

test("deterministic UUIDv5 mapping is valid, stable and explicitly non-reversible", () => {
  const first = deriveVaultQuarantineReference("vaultop_00000000000000000000000000000001");
  const second = deriveVaultQuarantineReference("vaultop_ffffffffffffffffffffffffffffffff");
  assert.equal(first, "fac548fd-b343-587c-9cfb-a5047f166479");
  assert.equal(second, "dc5a040a-b7ec-5c40-a19f-bf13d3ab30da");
  assert.match(first, /^[a-f0-9]{8}-[a-f0-9]{4}-5[a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/u);
  assert.notEqual(first, second);
  assert.throws(() => deriveVaultQuarantineReference("client-selected"), /operation_id is invalid/iu);
});

test("serialized concurrent exact requests and a restarted process converge on one durable owner", () => {
  const model = new MigrationZeroSchemaModel();
  const first = model.accept(request);
  const second = model.accept(request);
  assert.equal(first.outcome, "accepted");
  assert.equal(second.outcome, "replay");
  assert.equal(first.quarantine_ref, second.quarantine_ref);
  assert.equal(model.objects.size, 1);
  assert.equal(model.rows.size, 1);
  assert.equal(model.jobs.size, 1);

  const restarted = new MigrationZeroSchemaModel(model.snapshot());
  assert.equal(restarted.accept(request).outcome, "replay");
  assert.equal(restarted.objects.size, 1);
  assert.equal(restarted.rows.size, 1);
  assert.equal(restarted.jobs.size, 1);
});

test("changed replay and a forced derived-reference collision fail closed without deleting authority", () => {
  const model = new MigrationZeroSchemaModel();
  const accepted = model.accept(request);
  const changed = {
    ...request,
    request_fingerprint: "c".repeat(64),
    matter_id: "44444444-4444-4444-8444-444444444444",
  };
  assert.throws(() => model.accept(changed), /VAULT_OPERATION_IDEMPOTENCY_CONFLICT/iu);

  const otherOperation = {
    ...request,
    operation_id: "vaultop_fedcba9876543210fedcba9876543210",
    correlation_id: "vaultcorr_fedcba9876543210fedcba9876543210",
  };
  assert.throws(
    () => model.accept(otherOperation, { forcedReference: accepted.quarantine_ref }),
    /VAULT_OPERATION_IDEMPOTENCY_CONFLICT/iu,
  );
  assert.equal(model.objects.size, 1);
  assert.equal(model.rows.size, 1);
  assert.equal(model.jobs.size, 1);
});

test("object-before-commit crash is healed only by exact replay and drift never deletes the orphan", () => {
  const crashed = new MigrationZeroSchemaModel();
  assert.throws(
    () => crashed.accept(request, { crashAfterObject: true }),
    /SIMULATED_CRASH_AFTER_OBJECT/iu,
  );
  assert.equal(crashed.objects.size, 1);
  assert.equal(crashed.rows.size, 0);
  assert.equal(crashed.jobs.size, 0);

  const drifted = { ...request, sha256: "d".repeat(64) };
  assert.throws(() => crashed.accept(drifted), /VAULT_OPERATION_IDEMPOTENCY_CONFLICT/iu);
  assert.equal(crashed.objects.size, 1);
  assert.equal(crashed.rows.size, 0);

  const restarted = new MigrationZeroSchemaModel(crashed.snapshot());
  assert.equal(restarted.accept(request).outcome, "accepted");
  assert.equal(restarted.objects.size, 1);
  assert.equal(restarted.rows.size, 1);
  assert.equal(restarted.jobs.size, 1);
});

test("duplicate worker delivery yields one immutable exact-version promotion receipt", () => {
  const model = new MigrationZeroSchemaModel();
  model.accept(request);
  const exactVersion = Object.freeze({
    document_id: "55555555-5555-4555-8555-555555555555",
    version_id: "66666666-6666-4666-8666-666666666666",
    file_object_id: "77777777-7777-4777-8777-777777777777",
    sha256: request.sha256,
    byte_size: request.byte_size,
    mime_type: request.mime_type,
  });
  assert.equal(model.promote(request, exactVersion).outcome, "promoted");
  assert.equal(model.promote(request, exactVersion).outcome, "promotion_replay");
  assert.equal(model.promotions.size, 1);
  assert.throws(
    () => model.promote(request, { ...exactVersion, version_id: "88888888-8888-4888-8888-888888888888" }),
    /VAULT_OPERATION_EXACT_VERSION_MISMATCH/iu,
  );
  assert.equal(model.promotions.size, 1);
});
