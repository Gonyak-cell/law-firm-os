import assert from "node:assert/strict";
import test from "node:test";
import {
  createJsonPostgresRehearsalBackupRetentionContract,
} from "../lib/json-postgres-rehearsal-contracts.mjs";
import {
  createJsonPostgresRehearsalDmsManifest,
} from "../lib/json-postgres-rehearsal-dms-manifest.mjs";

function corpus({ synthetic = true, sha256 = "seed" } = {}) {
  const tenant = "tenant_amic";
  return {
    schema_version: "law-firm-os.json-postgres-migration-corpus.v1",
    data_scope: "approved-real-manifest",
    tenant_id: tenant,
    accounts: [],
    domains: [{
      domain_id: "dms-auxiliary",
      records: [
        {
          record_type: "DmsWorkspace",
          record_id: "workspace-1",
          payload_hash: "a".repeat(64),
          payload: { workspace_id: "workspace-1", tenant_id: tenant },
        },
        {
          record_type: "DmsDocument",
          record_id: "document-1",
          payload_hash: "b".repeat(64),
          payload: {
            document_id: "document-1",
            tenant_id: tenant,
            matter_id: "matter-1",
            workspace_id: "workspace-1",
            title: "Private title",
            legal_hold_id: null,
          },
        },
        {
          record_type: "DmsDocumentVersion",
          record_id: "version-1",
          payload_hash: "c".repeat(64),
          payload: {
            version_id: "version-1",
            document_id: "document-1",
            file_object_id: "object-1",
            version_number: 1,
            created_by: "user-1",
          },
        },
        {
          record_type: "DmsFileObject",
          record_id: "object-1",
          payload_hash: "d".repeat(64),
          payload: {
            file_object_id: "object-1",
            sha256,
            byte_size: 0,
            mime_type: "application/octet-stream",
            permission_envelope_id: "permission-1",
            audit_trace_id: "audit-1",
            owner_user_id: "user-1",
            synthetic_only: synthetic,
          },
        },
      ],
      idempotency_entries: [],
      audit_events: [],
    }],
  };
}

test("W12 DMS manifest preserves synthetic metadata lineage without inventing document bytes", () => {
  const created = createJsonPostgresRehearsalDmsManifest({
    corpus: corpus(),
    authorityManifestSha256: "e".repeat(64),
    retentionContract: createJsonPostgresRehearsalBackupRetentionContract(),
  });
  assert.equal(created.manifest.objects.length, 0);
  assert.equal(created.classification.real_object_count, 0);
  assert.equal(created.classification.excluded_synthetic_metadata_count, 1);
  assert.equal(
    created.classification.metadata_records_preserved_in_generic_ledger,
    true,
  );
  assert.equal(created.classification.document_bytes_in_evidence, false);
});

test("W12 DMS manifest rejects a real object without an immutable source version", () => {
  assert.throws(() => createJsonPostgresRehearsalDmsManifest({
    corpus: corpus({ synthetic: false, sha256: "f".repeat(64) }),
    authorityManifestSha256: "e".repeat(64),
    retentionContract: createJsonPostgresRehearsalBackupRetentionContract(),
  }), /immutable source version/u);
});

test("W12 DMS manifest accepts only an exact immutable source locator for real bytes", () => {
  const created = createJsonPostgresRehearsalDmsManifest({
    corpus: corpus({ synthetic: false, sha256: "f".repeat(64) }),
    authorityManifestSha256: "e".repeat(64),
    retentionContract: createJsonPostgresRehearsalBackupRetentionContract(),
    sourceObjectMap: {
      schema_version: "law-firm-os.json-postgres-dms-source-object-map.v1",
      objects: [{
        file_object_id: "object-1",
        bucket: "lawos-private-rehearsal-input-770880870480",
        key: "program-input/dms/source-object-1",
        version_id: "immutable-version-1",
        expected_bucket_owner: "770880870480",
      }],
    },
  });
  assert.equal(created.manifest.objects.length, 1);
  assert.equal(created.manifest.objects[0].source_path, null);
  assert.equal(created.classification.real_object_count, 1);
  assert.equal(created.classification.unclassified_file_object_count, 0);
});
