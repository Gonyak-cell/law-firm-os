import assert from "node:assert/strict";
import test from "node:test";
import { createMigratedPostgresFixture } from "../../persistence/test/helpers/disposable-postgres.js";
import {
  JSON_POSTGRES_DMS_OBJECT_MANIFEST_VERSION,
  prepareJsonPostgresDmsObjectManifest,
  runJsonPostgresDmsObjectMigration,
} from "../src/json-postgres-dms-migration.js";
import { createPostgresDmsUploadRuntime } from "../src/postgres-upload-runtime.js";
import { createLocalStorageAdapter } from "../src/storage/local-storage-adapter.js";
import { sha256Hex } from "../src/storage/storage-adapter.js";

const TENANT = "tenant-real-dms-a";
const OTHER_TENANT = "tenant-real-dms-b";
const BYTES = Buffer.from("approved real migration fixture bytes");
const NOW = "2026-07-23T00:00:00.000Z";

function manifest() {
  return {
    schema_version: JSON_POSTGRES_DMS_OBJECT_MANIFEST_VERSION,
    data_scope: "approved-real-manifest",
    tenant_id: TENANT,
    authority_manifest_sha256: "a".repeat(64),
    retention_contract_sha256: "b".repeat(64),
    objects: [{
      source_ref: "object-source-ref-001",
      source_path: "/private/source/document-001.pdf",
      tenant_id: TENANT,
      document_id: "document-001",
      matter_id: "matter-001",
      workspace_id: "workspace-001",
      title: "Approved migration fixture",
      mime_type: "application/pdf",
      version_id: "version-001",
      version_number: 1,
      object_id: "object-001",
      permission_envelope_id: "permission-001",
      audit_trace_id: "trace-001",
      actor_id: "migration-operator",
      sha256: sha256Hex(BYTES),
      byte_size: BYTES.byteLength,
      retention: {
        policy_id: "retention-001",
        retain_until: "2027-07-23T00:00:00.000Z",
      },
      legal_hold: {
        hold_id: "hold-001",
        reason: "approved migration hold fixture",
        created_by: "legal-operator",
      },
    }],
  };
}

function objectLockStorage() {
  const base = createLocalStorageAdapter({ adapter_id: "s3-object-lock-test" });
  const retention = new Map();
  const holds = new Map();
  return Object.freeze({
    ...base,
    provider: "s3",
    capabilities: Object.freeze({
      ...base.capabilities,
      provider_retention: true,
      digest_verification: true,
    }),
    async statObject(input) {
      const value = await base.statObject(input);
      return value ? Object.freeze({ ...value, version_id: "provider-version-001" }) : null;
    },
    async setObjectRetention(input) {
      retention.set(input.object_id, { mode: input.mode, retain_until: input.retain_until });
      return retention.get(input.object_id);
    },
    async getObjectRetention(input) {
      return Object.freeze({ ...(retention.get(input.object_id) ?? { mode: null, retain_until: null }), version_id: "provider-version-001" });
    },
    async setObjectLegalHold(input) {
      holds.set(input.object_id, input.status);
      return { status: input.status, version_id: "provider-version-001" };
    },
    async getObjectLegalHold(input) {
      return { status: holds.get(input.object_id) ?? "OFF", version_id: "provider-version-001" };
    },
  });
}

test("DMS real-data manifest is closed, digest-bound, and dry-run evidence omits paths and bytes", async () => {
  const prepared = prepareJsonPostgresDmsObjectManifest(manifest());
  assert.match(prepared.manifest_sha256, /^[0-9a-f]{64}$/u);
  const result = await runJsonPostgresDmsObjectMigration({
    manifest: prepared,
    mode: "dry-run",
    loadBytes: async () => BYTES,
  });
  assert.equal(result.outcome, "PASS");
  assert.equal(result.safe_counts.source_object_count, 1);
  assert.equal(result.claims.provider_write, false);
  const serialized = JSON.stringify(result);
  assert.equal(serialized.includes("/private/source"), false);
  assert.equal(serialized.includes(BYTES.toString("utf8")), false);

  const drifted = structuredClone(prepared);
  drifted.objects[0].sha256 = "c".repeat(64);
  assert.throws(
    () => prepareJsonPostgresDmsObjectManifest(drifted),
    (error) => error?.code === "DMS_MIGRATION_BINDING",
  );
  const extra = manifest();
  extra.objects[0].password = "must-not-be-ignored";
  assert.throws(
    () => prepareJsonPostgresDmsObjectManifest(extra),
    (error) => error?.code === "DMS_MIGRATION_SCHEMA",
  );

  const immutable = manifest();
  delete immutable.objects[0].source_path;
  immutable.objects[0].source_object = {
    bucket: "lawos-approved-source",
    key: "approved/document-001.pdf",
    version_id: "immutable-version-001",
    expected_bucket_owner: "770880870480",
  };
  const preparedImmutable = prepareJsonPostgresDmsObjectManifest(immutable);
  assert.equal(preparedImmutable.objects[0].source_path, null);
  assert.equal(preparedImmutable.objects[0].source_object.version_id, "immutable-version-001");

  const ambiguous = manifest();
  ambiguous.objects[0].source_object = immutable.objects[0].source_object;
  assert.throws(
    () => prepareJsonPostgresDmsObjectManifest(ambiguous),
    (error) => error?.code === "DMS_MIGRATION_SOURCE",
  );

  const mutableObject = structuredClone(immutable);
  delete mutableObject.objects[0].source_object.version_id;
  assert.throws(
    () => prepareJsonPostgresDmsObjectManifest(mutableObject),
    (error) => error?.code === "DMS_MIGRATION_SCHEMA",
  );
});

test("DMS real-data import uses PostgreSQL metadata plus S3 Object Lock and resumes idempotently", async (t) => {
  const fixture = await createMigratedPostgresFixture(t);
  if (!fixture) return;
  const storage = objectLockStorage();
  const runtime = createPostgresDmsUploadRuntime({
    pool: fixture.appPool,
    storage,
    clock: () => new Date(NOW),
    idFactory: () => "dms-migration-test",
  });
  const prepared = prepareJsonPostgresDmsObjectManifest(manifest());
  let checkpoint;
  const first = await runJsonPostgresDmsObjectMigration({
    manifest: prepared,
    mode: "import",
    runtime,
    storage,
    loadBytes: async () => BYTES,
    negativeTenantId: OTHER_TENANT,
    onCheckpoint: async (value) => { checkpoint = value; },
  });
  assert.equal(first.outcome, "PASS");
  assert.equal(first.safe_counts.completed_object_count, 1);
  assert.equal(first.safe_counts.provider_version_count, 1);
  assert.equal(first.safe_counts.legal_hold_verified_count, 1);
  assert.equal(first.safe_counts.tenant_negative_visible_count, 0);
  assert.equal(checkpoint.completed_object_refs.length, 1);

  const resumed = await runJsonPostgresDmsObjectMigration({
    manifest: prepared,
    mode: "resume",
    runtime,
    storage,
    loadBytes: async () => BYTES,
    checkpoint,
    negativeTenantId: OTHER_TENANT,
  });
  assert.equal(resumed.invariant_hash, first.invariant_hash);
  assert.equal(resumed.safe_counts.completed_object_count, 1);
  assert.equal((await runtime.getDocumentState({ tenant_id: TENANT, document_id: "document-001" })).document.legal_hold_status, "active");
});

test("DMS import reports no provider or metadata write for an approved empty byte manifest", async () => {
  const prepared = prepareJsonPostgresDmsObjectManifest({
    ...manifest(),
    objects: [],
  });
  const runtime = {
    capabilities: {
      authority: "postgres-v2",
      json_fallback: false,
      dual_write: false,
      provider_finalize_before_metadata: true,
      independent_digest_readback: true,
    },
  };
  const storage = {
    provider: "s3",
    capabilities: {
      provider_retention: true,
      digest_verification: true,
    },
  };
  const result = await runJsonPostgresDmsObjectMigration({
    manifest: prepared,
    mode: "import",
    runtime,
    storage,
    negativeTenantId: OTHER_TENANT,
  });
  assert.equal(result.outcome, "PASS");
  assert.equal(result.safe_counts.source_object_count, 0);
  assert.equal(result.safe_counts.completed_object_count, 0);
  assert.equal(result.claims.provider_write, false);
  assert.equal(result.claims.postgres_metadata_write, false);
});

test("DMS migration fails closed without an S3 Object Lock and digest-readback target", async (t) => {
  const fixture = await createMigratedPostgresFixture(t);
  if (!fixture) return;
  const storage = createLocalStorageAdapter({ adapter_id: "not-s3" });
  const runtime = createPostgresDmsUploadRuntime({ pool: fixture.appPool, storage, clock: () => new Date(NOW) });
  await assert.rejects(
    runJsonPostgresDmsObjectMigration({
      manifest: manifest(),
      mode: "import",
      runtime,
      storage,
      loadBytes: async () => BYTES,
    }),
    (error) => error?.code === "DMS_MIGRATION_TARGET",
  );
});
