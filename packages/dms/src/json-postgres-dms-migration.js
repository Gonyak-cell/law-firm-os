import { createHash } from "node:crypto";

export const JSON_POSTGRES_DMS_OBJECT_MANIFEST_VERSION = "law-firm-os.json-postgres-dms-object-manifest.v1";
export const JSON_POSTGRES_DMS_MIGRATION_CHECKPOINT_VERSION = "law-firm-os.json-postgres-dms-migration-checkpoint.v1";
export const JSON_POSTGRES_DMS_MIGRATION_RESULT_VERSION = "law-firm-os.json-postgres-dms-migration-result.v1";
export const JSON_POSTGRES_DMS_MIGRATION_MODES = Object.freeze([
  "validate-only",
  "dry-run",
  "import",
  "resume",
  "readback",
  "reconcile",
]);

const MODES = new Set(JSON_POSTGRES_DMS_MIGRATION_MODES);
const SHA256 = /^[0-9a-f]{64}$/u;
const MANIFEST_KEYS = Object.freeze([
  "schema_version",
  "data_scope",
  "tenant_id",
  "authority_manifest_sha256",
  "retention_contract_sha256",
  "objects",
  "manifest_sha256",
]);
const OBJECT_KEYS = Object.freeze([
  "source_ref",
  "source_path",
  "source_object",
  "tenant_id",
  "document_id",
  "matter_id",
  "workspace_id",
  "title",
  "mime_type",
  "version_id",
  "version_number",
  "object_id",
  "permission_envelope_id",
  "audit_trace_id",
  "actor_id",
  "sha256",
  "byte_size",
  "retention",
  "legal_hold",
]);
const SOURCE_OBJECT_KEYS = Object.freeze(["bucket", "key", "version_id", "expected_bucket_owner"]);
const RETENTION_KEYS = Object.freeze(["policy_id", "retain_until"]);
const LEGAL_HOLD_KEYS = Object.freeze(["hold_id", "reason", "created_by"]);

function stableJson(value) {
  if (Array.isArray(value)) return `[${value.map(stableJson).join(",")}]`;
  if (value && typeof value === "object") {
    return `{${Object.keys(value).sort().map((key) => `${JSON.stringify(key)}:${stableJson(value[key])}`).join(",")}}`;
  }
  return JSON.stringify(value);
}

function sha256(value) {
  return createHash("sha256").update(Buffer.isBuffer(value) ? value : stableJson(value)).digest("hex");
}

function fail(code, message, details = {}) {
  const error = new Error(message);
  error.code = code;
  error.details = details;
  throw error;
}

function closedObject(value, keys, label) {
  if (!value || typeof value !== "object" || Array.isArray(value)) fail("DMS_MIGRATION_SCHEMA", `${label} must be an object`);
  const extras = Object.keys(value).filter((key) => !keys.includes(key));
  if (extras.length > 0) fail("DMS_MIGRATION_SCHEMA", `${label} contains unsupported fields`, { extras });
}

function requiredText(value, label) {
  const text = String(value ?? "").trim();
  if (!text || text.length > 1024 || /[\u0000-\u001f\u007f]/u.test(text)) {
    fail("DMS_MIGRATION_SCHEMA", `${label} is invalid`);
  }
  return text;
}

function requiredDigest(value, label) {
  if (!SHA256.test(value ?? "")) fail("DMS_MIGRATION_SCHEMA", `${label} must be a SHA-256 digest`);
  return value;
}

function requiredTimestamp(value, label) {
  const text = requiredText(value, label);
  if (!Number.isFinite(Date.parse(text)) || !/Z$/u.test(text)) fail("DMS_MIGRATION_SCHEMA", `${label} must be a UTC timestamp`);
  return new Date(text).toISOString();
}

function normalizeSourceLocation(source, index) {
  const hasPath = source.source_path != null;
  const hasObject = source.source_object != null;
  if (hasPath === hasObject) {
    fail("DMS_MIGRATION_SOURCE", `objects[${index}] must bind exactly one immutable source location`);
  }
  if (hasPath) {
    return Object.freeze({
      source_path: requiredText(source.source_path, "source_path"),
      source_object: null,
    });
  }
  closedObject(source.source_object, SOURCE_OBJECT_KEYS, `objects[${index}].source_object`);
  const bucket = requiredText(source.source_object.bucket, "source_object.bucket");
  const key = requiredText(source.source_object.key, "source_object.key");
  const versionId = requiredText(source.source_object.version_id, "source_object.version_id");
  const expectedBucketOwner = requiredText(
    source.source_object.expected_bucket_owner,
    "source_object.expected_bucket_owner",
  );
  if (!/^(?!xn--)[a-z0-9][a-z0-9.-]{1,61}[a-z0-9]$/u.test(bucket)
    || key.split("/").includes("..")
    || !/^\d{12}$/u.test(expectedBucketOwner)) {
    fail("DMS_MIGRATION_SOURCE", `objects[${index}].source_object is invalid`);
  }
  return Object.freeze({
    source_path: null,
    source_object: Object.freeze({
      bucket,
      key,
      version_id: versionId,
      expected_bucket_owner: expectedBucketOwner,
    }),
  });
}

function normalizeObject(source, tenantId, index) {
  closedObject(source, OBJECT_KEYS, `objects[${index}]`);
  if (source.tenant_id !== tenantId) fail("DMS_MIGRATION_TENANT", "DMS object tenant does not match the manifest");
  const byteSize = Number(source.byte_size);
  const versionNumber = Number(source.version_number);
  if (!Number.isSafeInteger(byteSize) || byteSize < 0) fail("DMS_MIGRATION_SCHEMA", "DMS object byte_size is invalid");
  if (!Number.isSafeInteger(versionNumber) || versionNumber < 1) fail("DMS_MIGRATION_SCHEMA", "DMS version_number is invalid");
  closedObject(source.retention, RETENTION_KEYS, `objects[${index}].retention`);
  const retention = Object.freeze({
    policy_id: requiredText(source.retention.policy_id, "retention.policy_id"),
    retain_until: requiredTimestamp(source.retention.retain_until, "retention.retain_until"),
  });
  let legalHold = null;
  if (source.legal_hold != null) {
    closedObject(source.legal_hold, LEGAL_HOLD_KEYS, `objects[${index}].legal_hold`);
    legalHold = Object.freeze({
      hold_id: requiredText(source.legal_hold.hold_id, "legal_hold.hold_id"),
      reason: requiredText(source.legal_hold.reason, "legal_hold.reason"),
      created_by: requiredText(source.legal_hold.created_by, "legal_hold.created_by"),
    });
  }
  const sourceLocation = normalizeSourceLocation(source, index);
  return Object.freeze({
    source_ref: requiredText(source.source_ref, "source_ref"),
    ...sourceLocation,
    tenant_id: tenantId,
    document_id: requiredText(source.document_id, "document_id"),
    matter_id: requiredText(source.matter_id, "matter_id"),
    workspace_id: requiredText(source.workspace_id, "workspace_id"),
    title: requiredText(source.title, "title"),
    mime_type: requiredText(source.mime_type, "mime_type"),
    version_id: requiredText(source.version_id, "version_id"),
    version_number: versionNumber,
    object_id: requiredText(source.object_id, "object_id"),
    permission_envelope_id: requiredText(source.permission_envelope_id, "permission_envelope_id"),
    audit_trace_id: requiredText(source.audit_trace_id, "audit_trace_id"),
    actor_id: requiredText(source.actor_id, "actor_id"),
    sha256: requiredDigest(source.sha256, "object sha256"),
    byte_size: byteSize,
    retention,
    legal_hold: legalHold,
  });
}

function manifestMaterial(manifest) {
  return {
    schema_version: manifest.schema_version,
    data_scope: manifest.data_scope,
    tenant_id: manifest.tenant_id,
    authority_manifest_sha256: manifest.authority_manifest_sha256,
    retention_contract_sha256: manifest.retention_contract_sha256,
    objects: manifest.objects,
  };
}

function objectRef(manifestSha256, object) {
  return sha256({
    manifest_sha256: manifestSha256,
    tenant_id: object.tenant_id,
    document_id: object.document_id,
    version_id: object.version_id,
    object_id: object.object_id,
  }).slice(0, 32);
}

export function prepareJsonPostgresDmsObjectManifest(manifest = {}) {
  closedObject(manifest, MANIFEST_KEYS, "DMS object manifest");
  if (manifest.schema_version !== JSON_POSTGRES_DMS_OBJECT_MANIFEST_VERSION) {
    fail("DMS_MIGRATION_SCHEMA", "DMS object manifest schema is invalid");
  }
  if (manifest.data_scope !== "approved-real-manifest") fail("DMS_MIGRATION_SCOPE", "DMS object manifest must be owner-approved real data");
  const tenantId = requiredText(manifest.tenant_id, "manifest tenant_id");
  const objects = (manifest.objects ?? []).map((source, index) => normalizeObject(source, tenantId, index));
  const identities = new Set();
  const versionIdentities = new Set();
  const sourceRefs = new Set();
  for (const object of objects) {
    const identity = `${object.tenant_id}:${object.object_id}`;
    const versionIdentity = `${object.tenant_id}:${object.document_id}:${object.version_id}`;
    if (identities.has(identity) || versionIdentities.has(versionIdentity) || sourceRefs.has(object.source_ref)) {
      fail("DMS_MIGRATION_DUPLICATE", "DMS manifest contains a duplicate object, version, or source reference");
    }
    identities.add(identity);
    versionIdentities.add(versionIdentity);
    sourceRefs.add(object.source_ref);
  }
  const normalized = Object.freeze({
    schema_version: JSON_POSTGRES_DMS_OBJECT_MANIFEST_VERSION,
    data_scope: "approved-real-manifest",
    tenant_id: tenantId,
    authority_manifest_sha256: requiredDigest(manifest.authority_manifest_sha256, "authority_manifest_sha256"),
    retention_contract_sha256: requiredDigest(manifest.retention_contract_sha256, "retention_contract_sha256"),
    objects: Object.freeze(objects),
  });
  const manifestSha256 = sha256(manifestMaterial(normalized));
  if (manifest.manifest_sha256 && manifest.manifest_sha256 !== manifestSha256) {
    fail("DMS_MIGRATION_BINDING", "DMS object manifest digest drifted");
  }
  return Object.freeze({ ...normalized, manifest_sha256: manifestSha256 });
}

function validateCheckpoint(checkpoint, manifestSha256, refs) {
  if (checkpoint == null) return new Set();
  closedObject(checkpoint, ["schema_version", "manifest_sha256", "completed_object_refs"], "DMS migration checkpoint");
  if (checkpoint.schema_version !== JSON_POSTGRES_DMS_MIGRATION_CHECKPOINT_VERSION
    || checkpoint.manifest_sha256 !== manifestSha256
    || !Array.isArray(checkpoint.completed_object_refs)
    || checkpoint.completed_object_refs.some((ref) => typeof ref !== "string" || !refs.has(ref))
    || new Set(checkpoint.completed_object_refs).size !== checkpoint.completed_object_refs.length) {
    fail("DMS_MIGRATION_CHECKPOINT", "DMS migration checkpoint is invalid or source-drifted");
  }
  return new Set(checkpoint.completed_object_refs);
}

function assertRuntime(runtime, storage) {
  if (!runtime || !storage) fail("DMS_MIGRATION_TARGET", "DMS runtime and storage are required");
  if (runtime.capabilities?.authority !== "postgres-v2"
    || runtime.capabilities?.json_fallback !== false
    || runtime.capabilities?.dual_write !== false
    || runtime.capabilities?.provider_finalize_before_metadata !== true
    || runtime.capabilities?.independent_digest_readback !== true
    || storage.provider !== "s3"
    || storage.capabilities?.provider_retention !== true
    || storage.capabilities?.digest_verification !== true) {
    fail("DMS_MIGRATION_TARGET", "DMS target does not satisfy the PostgreSQL and S3 Object Lock contract");
  }
}

async function readAndVerifyBytes(object, loadBytes) {
  if (typeof loadBytes !== "function") fail("DMS_MIGRATION_SOURCE", "DMS byte loader is required");
  const bytes = await loadBytes(object);
  if (!Buffer.isBuffer(bytes)) fail("DMS_MIGRATION_SOURCE", "DMS byte loader must return a Buffer");
  if (bytes.byteLength !== object.byte_size || sha256(bytes) !== object.sha256) {
    fail("DMS_MIGRATION_DIGEST", "DMS source bytes do not match the approved manifest");
  }
  return bytes;
}

async function verifyCommittedObject({ runtime, storage, object }) {
  const state = await runtime.getDocumentState({ tenant_id: object.tenant_id, document_id: object.document_id });
  const version = state?.versions?.find((candidate) => candidate.version_id === object.version_id);
  const fileObject = state?.file_objects?.find((candidate) => candidate.object_id === object.object_id);
  if (!state || !version || !fileObject
    || state.document.matter_id !== object.matter_id
    || state.document.workspace_id !== object.workspace_id
    || version.version_number !== object.version_number
    || version.sha256 !== object.sha256
    || fileObject.sha256 !== object.sha256
    || Number(fileObject.byte_size) !== object.byte_size
    || fileObject.status !== "committed") {
    fail("DMS_MIGRATION_READBACK", "DMS PostgreSQL metadata readback drifted");
  }
  const [stat, digest, retention] = await Promise.all([
    storage.statObject({ tenant_id: object.tenant_id, object_id: object.object_id }),
    storage.digestObject({ tenant_id: object.tenant_id, object_id: object.object_id }),
    storage.getObjectRetention({ tenant_id: object.tenant_id, object_id: object.object_id }),
  ]);
  if (stat?.sha256 !== object.sha256
    || Number(stat?.byte_size) !== object.byte_size
    || typeof stat?.version_id !== "string"
    || stat.version_id.length === 0
    || digest?.sha256 !== object.sha256
    || Number(digest?.byte_size) !== object.byte_size
    || !["GOVERNANCE", "COMPLIANCE"].includes(retention?.mode)
    || Date.parse(retention?.retain_until ?? "") < Date.parse(object.retention.retain_until)) {
    fail("DMS_MIGRATION_PROVIDER_READBACK", "DMS S3 digest/version/retention readback drifted");
  }
  if (object.legal_hold) {
    const hold = await storage.getObjectLegalHold({ tenant_id: object.tenant_id, object_id: object.object_id });
    if (hold?.status !== "ON") fail("DMS_MIGRATION_PROVIDER_READBACK", "DMS S3 legal hold readback drifted");
  }
  return Object.freeze({
    object_ref: objectRef("readback", object),
    provider_version_present: typeof stat.version_id === "string" && stat.version_id.length > 0,
    digest_verified: true,
    retention_verified: true,
    legal_hold_verified: object.legal_hold != null,
  });
}

export async function runJsonPostgresDmsObjectMigration({
  manifest,
  mode,
  runtime = null,
  storage = null,
  loadBytes = null,
  checkpoint = null,
  onCheckpoint = null,
  negativeTenantId = null,
  faultInjector = null,
} = {}) {
  if (!MODES.has(mode)) fail("DMS_MIGRATION_MODE", "DMS migration mode is invalid");
  const prepared = prepareJsonPostgresDmsObjectManifest(manifest);
  const refs = new Map(prepared.objects.map((object) => [objectRef(prepared.manifest_sha256, object), object]));
  const completed = validateCheckpoint(checkpoint, prepared.manifest_sha256, new Set(refs.keys()));
  const targetMode = ["import", "resume", "readback", "reconcile"].includes(mode);
  if (targetMode) assertRuntime(runtime, storage);
  const rows = [];
  let replayedCount = 0;
  let providerVersionCount = 0;
  let tenantNegativeVisibleCount = 0;
  for (const [ref, object] of refs) {
    if (mode === "validate-only") {
      rows.push(Object.freeze({ object_ref: ref, validated: true }));
      continue;
    }
    if (mode === "dry-run") {
      await readAndVerifyBytes(object, loadBytes);
      rows.push(Object.freeze({ object_ref: ref, source_digest_verified: true }));
      continue;
    }
    if (["import", "resume"].includes(mode) && !completed.has(ref)) {
      const bytes = await readAndVerifyBytes(object, loadBytes);
      faultInjector?.("before_upload", { object_ref: ref });
      const uploaded = await runtime.uploadDocument({
        document: {
          tenant_id: object.tenant_id,
          document_id: object.document_id,
          matter_id: object.matter_id,
          workspace_id: object.workspace_id,
          title: object.title,
          mime_type: object.mime_type,
          current_version_id: object.version_id,
          version_number: object.version_number,
          permission_envelope_id: object.permission_envelope_id,
          audit_trace_id: object.audit_trace_id,
        },
        bytes,
        actor_id: object.actor_id,
        idempotency_key: `json-postgres-dms:${prepared.manifest_sha256}:${ref}`,
        object_id: object.object_id,
        session_id: `json-postgres-dms:${ref}`,
        version_number: object.version_number,
      });
      await runtime.setRetentionPolicy({
        tenant_id: object.tenant_id,
        retention_policy_id: object.retention.policy_id,
        document_id: object.document_id,
        object_id: object.object_id,
        expected_matter_id: object.matter_id,
        retain_until: object.retention.retain_until,
      });
      if (object.legal_hold) {
        await runtime.placeLegalHold({
          tenant_id: object.tenant_id,
          legal_hold_id: object.legal_hold.hold_id,
          document_id: object.document_id,
          object_id: object.object_id,
          expected_matter_id: object.matter_id,
          created_by: object.legal_hold.created_by,
          reason: object.legal_hold.reason,
        });
      }
      if (uploaded.idempotent_replay) replayedCount += 1;
      faultInjector?.("after_governance_before_checkpoint", { object_ref: ref });
      completed.add(ref);
      if (typeof onCheckpoint === "function") {
        await onCheckpoint(Object.freeze({
          schema_version: JSON_POSTGRES_DMS_MIGRATION_CHECKPOINT_VERSION,
          manifest_sha256: prepared.manifest_sha256,
          completed_object_refs: Object.freeze([...completed].sort()),
        }));
      }
    }
    const verified = await verifyCommittedObject({ runtime, storage, object });
    if (verified.provider_version_present) providerVersionCount += 1;
    rows.push(Object.freeze({
      object_ref: ref,
      digest_verified: true,
      provider_version_present: verified.provider_version_present,
      retention_verified: true,
      legal_hold_verified: object.legal_hold != null,
      replayed: completed.has(ref) && mode === "resume",
    }));
  }
  if (targetMode && negativeTenantId) {
    if (negativeTenantId === prepared.tenant_id) fail("DMS_MIGRATION_TENANT", "negative tenant must differ from the source tenant");
    for (const object of prepared.objects) {
      const visible = await runtime.getDocumentState({ tenant_id: negativeTenantId, document_id: object.document_id });
      if (visible) tenantNegativeVisibleCount += 1;
    }
    if (tenantNegativeVisibleCount !== 0) fail("DMS_MIGRATION_TENANT", "DMS object metadata is visible to the wrong tenant");
  }
  const checkpointValue = Object.freeze({
    schema_version: JSON_POSTGRES_DMS_MIGRATION_CHECKPOINT_VERSION,
    manifest_sha256: prepared.manifest_sha256,
    completed_object_refs: Object.freeze([...completed].sort()),
  });
  const invariantHash = sha256(prepared.objects.map((object) => ({
    object_ref: objectRef(prepared.manifest_sha256, object),
    sha256: object.sha256,
    byte_size: object.byte_size,
    retain_until: object.retention.retain_until,
    legal_hold: object.legal_hold != null,
  })));
  const result = Object.freeze({
    schema_version: JSON_POSTGRES_DMS_MIGRATION_RESULT_VERSION,
    mode,
    outcome: "PASS",
    manifest_sha256: prepared.manifest_sha256,
    authority_manifest_sha256: prepared.authority_manifest_sha256,
    retention_contract_sha256: prepared.retention_contract_sha256,
    invariant_hash: invariantHash,
    checkpoint: checkpointValue,
    safe_counts: Object.freeze({
      source_object_count: prepared.objects.length,
      verified_object_count: rows.length,
      completed_object_count: completed.size,
      replayed_object_count: replayedCount,
      provider_version_count: providerVersionCount,
      retention_verified_count: targetMode ? prepared.objects.length : 0,
      legal_hold_verified_count: targetMode ? prepared.objects.filter((object) => object.legal_hold != null).length : 0,
      tenant_negative_visible_count: tenantNegativeVisibleCount,
      unexpected_rejection_count: 0,
    }),
    objects: Object.freeze(rows),
    claims: Object.freeze({
      real_data_read: mode !== "validate-only",
      provider_write: ["import", "resume"].includes(mode),
      postgres_metadata_write: ["import", "resume"].includes(mode),
      object_lock_required: true,
      raw_path_returned: false,
      document_bytes_returned: false,
      pii_returned: false,
      secret_material_returned: false,
    }),
  });
  return Object.freeze({ ...result, result_sha256: sha256(result) });
}
