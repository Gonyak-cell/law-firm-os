import { createHash } from "node:crypto";
import { lstat, readFile, realpath } from "node:fs/promises";
import { isAbsolute, relative, sep } from "node:path";
import {
  validateJsonPostgresSourceTransformPlan,
  validateJsonPostgresSourceTransformResult,
} from "../../apps/api/src/json-postgres-source-transform.js";
import {
  validateJsonPostgresExecutionPacket,
} from "../../packages/persistence/src/postgres/execution-contract.js";
import {
  validateJsonPostgresSourceLocatorManifest,
} from "../../packages/persistence/src/postgres/source-locator-manifest.js";

export const JSON_POSTGRES_SOURCE_BACKUP_PLAN_VERSION =
  "law-firm-os.json-postgres-source-backup-plan.v1";
export const JSON_POSTGRES_SOURCE_BACKUP_RESULT_VERSION =
  "law-firm-os.json-postgres-source-backup-result.v1";

const MAX_BACKUP_SOURCE_BYTES = 512 * 1024 * 1024;

function stableJson(value) {
  if (Array.isArray(value)) return `[${value.map(stableJson).join(",")}]`;
  if (value && typeof value === "object") {
    return `{${Object.keys(value).sort().map((key) => `${JSON.stringify(key)}:${stableJson(value[key])}`).join(",")}}`;
  }
  return JSON.stringify(value);
}

function sha256(value) {
  return createHash("sha256").update(value).digest("hex");
}

function planMaterial(value) {
  return {
    schema_version: value.schema_version,
    source_sha: value.source_sha,
    source_tree: value.source_tree,
    packet_sha256: value.packet_sha256,
    inventory_content_sha256: value.inventory_content_sha256,
    transform_sha256: value.transform_sha256,
    bucket: value.bucket,
    expected_bucket_owner: value.expected_bucket_owner,
    kms_key_ref: value.kms_key_ref,
    retain_until: value.retain_until,
    sources: value.sources,
    claims: value.claims,
  };
}

export function createJsonPostgresSourceBackupPlan({
  packet,
  inventory,
  locatorManifest,
  transformPlan,
  transformResult,
  retainUntil,
  now = Date.now(),
} = {}) {
  const validatedPacket = validateJsonPostgresExecutionPacket(packet, {
    sourceSha: packet?.source_sha,
    sourceTree: packet?.source_tree,
    phase: "w13-production-cutover",
  });
  validateJsonPostgresSourceLocatorManifest(locatorManifest, { inventory });
  validateJsonPostgresSourceTransformPlan(transformPlan, { inventory, locatorManifest });
  validateJsonPostgresSourceTransformResult(transformResult);
  const retainTime = Date.parse(retainUntil);
  if (!Number.isFinite(retainTime) || retainTime <= now) {
    throw new TypeError("source backup retention must be a future RFC 3339 timestamp");
  }
  if (inventory.inventory_content_sha256 !== packet.bindings.inventory_content_sha256
    || transformResult.result_sha256 !== packet.bindings.transform_sha256
    || transformResult.source_transform_plan_sha256 !== transformPlan.transform_sha256
    || transformResult.inventory_content_sha256 !== inventory.inventory_content_sha256
    || transformResult.migration_manifest_sha256 !== packet.bindings.migration_manifest_sha256) {
    throw new TypeError("source backup packet, inventory, and transform binding drifted");
  }
  const decisionByRef = new Map(transformPlan.sources.map((source) => [source.source_ref, source]));
  const sources = inventory.sources.map((source) => {
    const decision = decisionByRef.get(source.source_ref);
    if (!decision || decision.sha256 !== source.sha256) throw new TypeError("source backup authority decision drifted");
    return Object.freeze({
      source_ref: source.source_ref,
      root_ref: source.root_ref,
      sha256: source.sha256,
      byte_size: source.byte_size,
      classification: decision.classification,
      object_key: [
        "source-freeze",
        packet.source_sha,
        inventory.inventory_content_sha256,
        source.source_ref,
        `${source.sha256}.bin`,
      ].join("/"),
    });
  }).sort((left, right) => left.source_ref.localeCompare(right.source_ref));
  const value = Object.freeze({
    schema_version: JSON_POSTGRES_SOURCE_BACKUP_PLAN_VERSION,
    source_sha: packet.source_sha,
    source_tree: packet.source_tree,
    packet_sha256: validatedPacket.packet_sha256,
    inventory_content_sha256: inventory.inventory_content_sha256,
    transform_sha256: transformResult.result_sha256,
    bucket: packet.target.program_input_bucket_name,
    expected_bucket_owner: packet.target.program_input_expected_bucket_owner,
    kms_key_ref: packet.target.program_input_kms_key_ref,
    retain_until: new Date(retainTime).toISOString(),
    sources: Object.freeze(sources),
    claims: Object.freeze({
      source_mutated: false,
      postgres_mutated: false,
      production_write: false,
      external_email_sent: false,
      raw_value_returned: false,
      pii_returned: false,
      secret_material_returned: false,
    }),
  });
  return Object.freeze({
    ...value,
    backup_plan_sha256: sha256(stableJson(planMaterial(value))),
  });
}

export function createJsonPostgresSourceBackupPutReceipt({
  response,
  plan,
  source,
  kmsKeyArn,
} = {}) {
  if (typeof response?.VersionId !== "string" || !response.VersionId) {
    throw new TypeError("source backup upload returned no immutable version");
  }
  const retainUntil = response.ObjectLockRetainUntilDate == null
    ? plan?.retain_until
    : new Date(response.ObjectLockRetainUntilDate).toISOString();
  return Object.freeze({
    bucket: plan?.bucket,
    key: source?.object_key,
    version_id: response.VersionId,
    expected_bucket_owner: plan?.expected_bucket_owner,
    server_side_encryption: response.ServerSideEncryption ?? "aws:kms",
    kms_key_arn: response.SSEKMSKeyId ?? kmsKeyArn,
    object_lock_mode: response.ObjectLockMode ?? "COMPLIANCE",
    retain_until: retainUntil,
    content_sha256: source?.sha256,
    byte_size: source?.byte_size,
  });
}

async function exactBytes(locator, source) {
  if (!isAbsolute(locator?.root_path ?? "") || !isAbsolute(locator?.source_path ?? "")) {
    throw new TypeError("source backup locator is invalid");
  }
  if ((await lstat(locator.root_path)).isSymbolicLink()
    || (await lstat(locator.source_path)).isSymbolicLink()) {
    throw new TypeError("source backup locator must not use symlinks");
  }
  const [rootPath, sourcePath] = await Promise.all([
    realpath(locator.root_path),
    realpath(locator.source_path),
  ]);
  const rel = relative(rootPath, sourcePath);
  if (rel === ".." || rel.startsWith(`..${sep}`) || isAbsolute(rel)) {
    throw new TypeError("source backup locator escapes its approved root");
  }
  const metadata = await lstat(sourcePath);
  if (!metadata.isFile() || metadata.size !== source.byte_size
    || metadata.size > MAX_BACKUP_SOURCE_BYTES) {
    throw new TypeError("source backup file metadata drifted");
  }
  const bytes = await readFile(sourcePath);
  if (sha256(bytes) !== source.sha256) throw new TypeError(`source backup bytes drifted: ${source.source_ref}`);
  return bytes;
}

function validateStoredObject(value, source, plan, kmsKeyArn, now) {
  if (!value
    || typeof value.version_id !== "string"
    || !value.version_id
    || value.bucket !== plan.bucket
    || value.key !== source.object_key
    || value.expected_bucket_owner !== plan.expected_bucket_owner
    || value.server_side_encryption !== "aws:kms"
    || value.kms_key_arn !== kmsKeyArn
    || value.object_lock_mode !== "COMPLIANCE"
    || Date.parse(value.retain_until) !== Date.parse(plan.retain_until)
    || Date.parse(value.retain_until) <= now
    || value.content_sha256 !== source.sha256
    || value.byte_size !== source.byte_size) {
    throw new TypeError("source backup object governance or digest drifted");
  }
}

export async function executeJsonPostgresSourceBackup({
  packet,
  inventory,
  locatorManifest,
  transformPlan,
  transformResult,
  retainUntil,
  kmsKeyArn,
  putObject,
  getObject,
  now = Date.now(),
} = {}) {
  if (!/^arn:aws:kms:[a-z0-9-]+:\d{12}:key\/[A-Za-z0-9-]+$/u.test(kmsKeyArn ?? "")
    || typeof putObject !== "function"
    || typeof getObject !== "function") {
    throw new TypeError("source backup KMS key and object callbacks are required");
  }
  const plan = createJsonPostgresSourceBackupPlan({
    packet,
    inventory,
    locatorManifest,
    transformPlan,
    transformResult,
    retainUntil,
    now,
  });
  const locatorByRef = new Map(locatorManifest.sources.map((source) => [source.source_ref, source]));
  const objects = [];
  for (const source of plan.sources) {
    const locator = locatorByRef.get(source.source_ref);
    const bytes = await exactBytes(locator, source);
    const stored = await putObject({ plan, source, bytes, kmsKeyArn });
    validateStoredObject(stored, source, plan, kmsKeyArn, now);
    const restored = await getObject({ plan, source, stored, kmsKeyArn });
    validateStoredObject(restored, source, plan, kmsKeyArn, now);
    if (!Buffer.isBuffer(restored.bytes)
      || restored.bytes.length !== source.byte_size
      || sha256(restored.bytes) !== source.sha256) {
      throw new TypeError("isolated source backup restore digest drifted");
    }
    const current = await exactBytes(locator, source);
    if (sha256(current) !== source.sha256) throw new TypeError("source changed during immutable backup");
    objects.push(Object.freeze({
      source_ref: source.source_ref,
      root_ref: source.root_ref,
      classification: source.classification,
      sha256: source.sha256,
      byte_size: source.byte_size,
      bucket: stored.bucket,
      key: stored.key,
      version_id: stored.version_id,
      kms_key_arn_sha256: sha256(kmsKeyArn),
      object_lock_mode: stored.object_lock_mode,
      retain_until: stored.retain_until,
      restore_verified: true,
    }));
  }
  const resultMaterial = {
    schema_version: JSON_POSTGRES_SOURCE_BACKUP_RESULT_VERSION,
    source_sha: plan.source_sha,
    source_tree: plan.source_tree,
    packet_sha256: plan.packet_sha256,
    backup_plan_sha256: plan.backup_plan_sha256,
    inventory_content_sha256: plan.inventory_content_sha256,
    transform_sha256: plan.transform_sha256,
    objects,
    safe_counts: {
      source_count: objects.length,
      authoritative_source_count: objects.filter((object) => object.classification === "authoritative").length,
      uploaded_object_count: objects.length,
      restored_object_count: objects.length,
      digest_mismatch_count: 0,
      source_mutation_count: 0,
      production_write_count: 0,
      external_email_send_count: 0,
    },
    claims: {
      source_mutated: false,
      postgres_mutated: false,
      production_write: false,
      external_email_sent: false,
      raw_value_returned: false,
      pii_returned: false,
      secret_material_returned: false,
    },
  };
  return Object.freeze({
    plan,
    result: Object.freeze({
      ...resultMaterial,
      result_sha256: sha256(stableJson(resultMaterial)),
    }),
  });
}
