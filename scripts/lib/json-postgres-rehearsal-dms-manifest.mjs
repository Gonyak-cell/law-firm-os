import { createHash } from "node:crypto";
import {
  prepareJsonPostgresDmsObjectManifest,
} from "../../packages/dms/src/json-postgres-dms-migration.js";
import {
  validateJsonPostgresRehearsalBackupRetentionContract,
} from "./json-postgres-rehearsal-contracts.mjs";

const SHA256 = /^[0-9a-f]{64}$/u;
const SOURCE_OBJECT_MAP_VERSION =
  "law-firm-os.json-postgres-dms-source-object-map.v1";
const CLASSIFICATION_VERSION =
  "law-firm-os.json-postgres-rehearsal-dms-classification.v1";

function stableJson(value) {
  if (Array.isArray(value)) return `[${value.map(stableJson).join(",")}]`;
  if (value && typeof value === "object") {
    return `{${Object.keys(value).sort().map((key) =>
      `${JSON.stringify(key)}:${stableJson(value[key])}`).join(",")}}`;
  }
  return JSON.stringify(value);
}

function digest(value) {
  return createHash("sha256").update(stableJson(value)).digest("hex");
}

function fail(message) {
  throw new Error(message);
}

function records(corpus) {
  return (corpus.domains ?? []).flatMap((domain) =>
    (domain.records ?? []).map((record) => ({
      domain_id: domain.domain_id,
      ...record,
    })));
}

function requiredText(value, label) {
  const text = String(value ?? "").trim();
  if (!text) fail(`${label} is required`);
  return text;
}

function sourceObjectById(sourceObjectMap) {
  if (sourceObjectMap == null) return new Map();
  if (sourceObjectMap.schema_version !== SOURCE_OBJECT_MAP_VERSION
    || !Array.isArray(sourceObjectMap.objects)) {
    fail("DMS source object map schema is invalid");
  }
  const map = new Map();
  for (const object of sourceObjectMap.objects) {
    const id = requiredText(object.file_object_id, "file_object_id");
    if (map.has(id)) fail("DMS source object map contains a duplicate");
    const sourceObject = {
      bucket: requiredText(object.bucket, "source object bucket"),
      key: requiredText(object.key, "source object key"),
      version_id: requiredText(object.version_id, "source object version"),
      expected_bucket_owner: requiredText(
        object.expected_bucket_owner,
        "source object expected bucket owner",
      ),
    };
    map.set(id, sourceObject);
  }
  return map;
}

export function createJsonPostgresRehearsalDmsManifest({
  corpus,
  authorityManifestSha256,
  retentionContract,
  sourceObjectMap = null,
} = {}) {
  if (corpus?.schema_version
      !== "law-firm-os.json-postgres-migration-corpus.v1"
    || corpus.data_scope !== "approved-real-manifest"
    || !SHA256.test(authorityManifestSha256 ?? "")) {
    fail("DMS rehearsal manifest source binding is invalid");
  }
  const retention =
    validateJsonPostgresRehearsalBackupRetentionContract(retentionContract);
  const all = records(corpus);
  const byType = (type) => all.filter((record) => record.record_type === type);
  const documents = new Map(byType("DmsDocument").map((record) =>
    [record.payload?.document_id, record]));
  const versions = new Map(byType("DmsDocumentVersion").map((record) =>
    [record.payload?.file_object_id, record]));
  const workspaces = new Map(byType("DmsWorkspace").map((record) =>
    [record.payload?.workspace_id, record]));
  const sourceObjects = sourceObjectById(sourceObjectMap);
  const objects = [];
  const exclusions = [];

  for (const record of byType("DmsFileObject")) {
    const payload = record.payload ?? {};
    const sourceRef = digest({
      tenant_id: corpus.tenant_id,
      record_type: record.record_type,
      record_id: record.record_id,
      payload_hash: record.payload_hash,
    }).slice(0, 32);
    if (payload.synthetic_only === true) {
      exclusions.push({
        source_ref: sourceRef,
        reason_code: "SYNTHETIC_METADATA_HAS_NO_APPROVED_SOURCE_BYTES",
        archive_lineage_preserved: true,
      });
      continue;
    }
    if (!SHA256.test(payload.sha256 ?? "")
      || !Number.isSafeInteger(payload.byte_size)
      || payload.byte_size < 0) {
      fail("approved real DMS object has no valid byte digest or size");
    }
    const version = versions.get(payload.file_object_id);
    const document = documents.get(version?.payload?.document_id);
    const workspace = workspaces.get(document?.payload?.workspace_id);
    const sourceObject = sourceObjects.get(payload.file_object_id);
    if (!version || !document || !workspace || !sourceObject) {
      fail("approved real DMS object linkage or immutable source version is missing");
    }
    if (document.payload.legal_hold_id != null) {
      fail("approved held DMS object requires an explicit signed legal-hold manifest");
    }
    objects.push({
      source_ref: sourceRef,
      source_path: null,
      source_object: sourceObject,
      tenant_id: corpus.tenant_id,
      document_id: requiredText(document.payload.document_id, "document_id"),
      matter_id: requiredText(document.payload.matter_id, "matter_id"),
      workspace_id: requiredText(document.payload.workspace_id, "workspace_id"),
      title: requiredText(document.payload.title, "document title"),
      mime_type: requiredText(payload.mime_type, "mime_type"),
      version_id: requiredText(version.payload.version_id, "version_id"),
      version_number: Number(version.payload.version_number),
      object_id: requiredText(payload.file_object_id, "object_id"),
      permission_envelope_id: requiredText(
        payload.permission_envelope_id,
        "permission_envelope_id",
      ),
      audit_trace_id: requiredText(payload.audit_trace_id, "audit_trace_id"),
      actor_id: requiredText(
        version.payload.created_by ?? payload.owner_user_id,
        "actor_id",
      ),
      sha256: payload.sha256,
      byte_size: payload.byte_size,
      retention: {
        policy_id: retentionContract.dms_policy_id,
        retain_until: retentionContract.dms_retain_until,
      },
      legal_hold: null,
    });
  }
  if (sourceObjects.size !== objects.length) {
    fail("DMS source object map contains an unconsumed immutable source");
  }
  const prepared = prepareJsonPostgresDmsObjectManifest({
    schema_version: "law-firm-os.json-postgres-dms-object-manifest.v1",
    data_scope: "approved-real-manifest",
    tenant_id: requiredText(corpus.tenant_id, "tenant_id"),
    authority_manifest_sha256: authorityManifestSha256,
    retention_contract_sha256: retention.contract_sha256,
    objects,
  });
  const classificationMaterial = {
    schema_version: CLASSIFICATION_VERSION,
    data_scope: "approved-real-manifest",
    tenant_ref_sha256: digest(corpus.tenant_id),
    manifest_sha256: prepared.manifest_sha256,
    real_object_count: objects.length,
    excluded_synthetic_metadata_count: exclusions.length,
    unclassified_file_object_count:
      byType("DmsFileObject").length - objects.length - exclusions.length,
    exclusions,
    metadata_records_preserved_in_generic_ledger: true,
    document_bytes_in_evidence: false,
  };
  const classification = Object.freeze({
    ...classificationMaterial,
    classification_sha256: digest(classificationMaterial),
  });
  return Object.freeze({
    manifest: prepared,
    classification,
  });
}
