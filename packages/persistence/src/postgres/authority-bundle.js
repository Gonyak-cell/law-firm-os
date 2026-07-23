import { createHash } from "node:crypto";
import { runJsonPostgresMigration } from "./json-postgres-migration.js";
import { reconcileJsonPostgresMigrationCorpus } from "./migration-reconciliation.js";
import { validateJsonPostgresRecordTypeCatalog } from "./record-type-catalog.js";
import {
  createJsonPostgresFieldCrosswalk,
  createJsonPostgresInventoryDelta,
  createJsonPostgresSourceAuthorityManifest,
  JSON_POSTGRES_INVENTORY_DELTA_POLICY_SHA256,
} from "./source-authority-manifest.js";

export const JSON_POSTGRES_AUTHORITY_DECISIONS_VERSION = "law-firm-os.json-postgres-authority-decisions.v1";
export const JSON_POSTGRES_AUTHORITY_BUNDLE_VERSION = "law-firm-os.json-postgres-authority-bundle.v1";

const SHA256 = /^[0-9a-f]{64}$/u;
const SAFE_REF = /^[A-Za-z0-9_.:-]{1,160}$/u;
const REASON_CODE = /^[A-Z][A-Z0-9_]{2,63}$/u;
const CLOSED_DECISION_KEYS = new Set([
  "schema_version",
  "decision_set_ref",
  "inventory_content_sha256",
  "record_type_catalog_sha256",
  "approved_root_refs",
  "decisions",
  "field_overrides",
  "expected_rejections",
]);

function stableJson(value) {
  if (Array.isArray(value)) return `[${value.map(stableJson).join(",")}]`;
  if (value && typeof value === "object") {
    return `{${Object.keys(value).sort().map((key) => `${JSON.stringify(key)}:${stableJson(value[key])}`).join(",")}}`;
  }
  return JSON.stringify(value);
}

function sha256(value) {
  return createHash("sha256").update(typeof value === "string" ? value : stableJson(value)).digest("hex");
}

function requiredRef(value, label) {
  const ref = String(value ?? "").trim();
  if (!SAFE_REF.test(ref)) throw new TypeError(`${label} is invalid`);
  return ref;
}

function requiredDigest(value, label) {
  const digest = String(value ?? "");
  if (!SHA256.test(digest)) throw new TypeError(`${label} must be a SHA-256 digest`);
  return digest;
}

function validateDecisions(decisions = {}) {
  if (!decisions || typeof decisions !== "object" || Array.isArray(decisions)) {
    throw new TypeError("authority decisions must be an object");
  }
  const extras = Object.keys(decisions).filter((key) => !CLOSED_DECISION_KEYS.has(key));
  if (extras.length > 0) throw new TypeError(`authority decisions contain unsupported fields: ${extras.join(",")}`);
  if (decisions.schema_version !== JSON_POSTGRES_AUTHORITY_DECISIONS_VERSION) {
    throw new TypeError("authority decisions schema is invalid");
  }
  requiredRef(decisions.decision_set_ref, "authority decision set ref");
  requiredDigest(decisions.inventory_content_sha256, "authority inventory digest");
  requiredDigest(decisions.record_type_catalog_sha256, "authority record-type catalog digest");
  for (const field of ["approved_root_refs", "decisions", "field_overrides", "expected_rejections"]) {
    if (!Array.isArray(decisions[field])) throw new TypeError(`authority decisions ${field} must be an array`);
  }
  const rejectionKeys = new Set();
  for (const rejection of decisions.expected_rejections) {
    if (!/^[0-9a-f]{32}$/u.test(rejection.record_ref ?? "")) throw new TypeError("expected rejection record ref is invalid");
    if (!REASON_CODE.test(rejection.reason_code ?? "")) throw new TypeError("expected rejection reason code is invalid");
    requiredRef(rejection.decision_ref, "expected rejection decision ref");
    const key = `${rejection.record_ref}:${rejection.reason_code}`;
    if (rejectionKeys.has(key)) throw new TypeError("expected rejection decisions contain duplicates");
    rejectionKeys.add(key);
  }
  return decisions;
}

function validateSourceTransformResult(result, inventory) {
  if (!result) return null;
  if (result.schema_version !== "law-firm-os.json-postgres-source-transform-result.v1"
    || !SHA256.test(result.result_sha256 ?? "")
    || !SHA256.test(result.source_transform_plan_sha256 ?? "")
    || !SHA256.test(result.migration_manifest_sha256 ?? "")
    || result.inventory_content_sha256 !== inventory.inventory_content_sha256) {
    throw new TypeError("source transform result binding is invalid");
  }
  const material = {
    schema_version: result.schema_version,
    inventory_content_sha256: result.inventory_content_sha256,
    locator_manifest_sha256: result.locator_manifest_sha256,
    source_transform_plan_sha256: result.source_transform_plan_sha256,
    migration_manifest_sha256: result.migration_manifest_sha256,
    safe_counts: result.safe_counts,
    claims: result.claims,
  };
  if (sha256(material) !== result.result_sha256) throw new TypeError("source transform result digest drifted");
  if (!result.claims || Object.values(result.claims).some((value) => value !== false)) {
    throw new TypeError("source transform result contains an affirmative claim");
  }
  return result;
}

export async function createJsonPostgresAuthorityBundle({
  inventory = {},
  decisions = {},
  recordTypeCatalog = {},
  corpus = {},
  baseManifest = null,
  sourceTransformResult = null,
} = {}) {
  validateDecisions(decisions);
  validateJsonPostgresRecordTypeCatalog(recordTypeCatalog);
  const transform = validateSourceTransformResult(sourceTransformResult, inventory);
  if (corpus.data_scope !== "approved-real-manifest") throw new TypeError("authority bundle requires approved-real-manifest data scope");
  if (decisions.inventory_content_sha256 !== inventory.inventory_content_sha256) {
    throw new TypeError("authority decisions inventory digest drifted");
  }
  if (decisions.record_type_catalog_sha256 !== recordTypeCatalog.catalog_sha256) {
    throw new TypeError("authority decisions record-type catalog digest drifted");
  }
  const fieldCrosswalk = createJsonPostgresFieldCrosswalk({
    inventory,
    recordTypeCatalog,
    overrides: decisions.field_overrides,
  });
  const authorityManifest = createJsonPostgresSourceAuthorityManifest({
    inventory,
    decisions: decisions.decisions,
    approvedRootRefs: decisions.approved_root_refs,
    recordTypeCatalog,
    fieldCrosswalk,
  });
  const migrationDryRun = await runJsonPostgresMigration({
    corpus,
    mode: "dry-run",
    allowRealData: true,
    recordTypeCatalog,
  });
  const reconciliation = reconcileJsonPostgresMigrationCorpus({
    corpus,
    recordTypeCatalog,
    expectedRejections: decisions.expected_rejections,
  });
  if (transform && transform.migration_manifest_sha256 !== migrationDryRun.source_manifest_sha256) {
    throw new TypeError("source transform migration manifest drifted");
  }
  const inventoryDelta = baseManifest
    ? createJsonPostgresInventoryDelta({ baseManifest, currentInventory: inventory })
    : null;
  const readyForOwnerSignature = reconciliation.outcome === "PASS"
    && authorityManifest.counts.unresolved_count === 0
    && migrationDryRun.outcome === "PASS"
    && (inventoryDelta?.counts.requires_review_count ?? 0) === 0;
  const summaryMaterial = {
    schema_version: JSON_POSTGRES_AUTHORITY_BUNDLE_VERSION,
    decision_set_ref: decisions.decision_set_ref,
    outcome: readyForOwnerSignature ? "READY_FOR_OWNER_SIGNATURE" : "BLOCKED",
    ready_for_owner_signature: readyForOwnerSignature,
    inventory_content_sha256: inventory.inventory_content_sha256,
    record_type_catalog_sha256: recordTypeCatalog.catalog_sha256,
    field_crosswalk_sha256: fieldCrosswalk.field_crosswalk_sha256,
    authority_manifest_sha256: authorityManifest.manifest_sha256,
    migration_manifest_sha256: migrationDryRun.source_manifest_sha256,
    transform_sha256: transform?.result_sha256 ?? null,
    source_transform_plan_sha256: transform?.source_transform_plan_sha256 ?? null,
    migration_invariant_hash: migrationDryRun.invariant_hash,
    reconciliation_sha256: reconciliation.reconciliation_sha256,
    inventory_delta_policy_sha256: JSON_POSTGRES_INVENTORY_DELTA_POLICY_SHA256,
    inventory_delta_sha256: inventoryDelta?.delta_sha256 ?? null,
    safe_counts: {
      source_count: authorityManifest.counts.source_count,
      authoritative_source_count: authorityManifest.counts.authoritative_count,
      superseded_source_count: authorityManifest.counts.superseded_count,
      duplicate_source_count: authorityManifest.counts.duplicate_count,
      synthetic_source_count: authorityManifest.counts.synthetic_count,
      corrupt_source_count: authorityManifest.counts.corrupt_count,
      unresolved_source_count: authorityManifest.counts.unresolved_count,
      field_count: fieldCrosswalk.fields.length,
      accepted_record_count: migrationDryRun.safe_counts.accepted_record_count,
      expected_rejected_count: reconciliation.safe_counts.expected_rejected_count,
      unexpected_rejected_count: reconciliation.safe_counts.unexpected_rejected_count,
      missing_expected_rejected_count: reconciliation.safe_counts.missing_expected_rejected_count,
      logical_reference_missing_count: reconciliation.safe_counts.missing_logical_reference_count,
      reconciliation_blocking_count: reconciliation.safe_counts.blocking_count,
      inventory_delta_review_count: inventoryDelta?.counts.requires_review_count ?? 0,
    },
    claims: {
      raw_value_returned: false,
      pii_returned: false,
      secret_material_returned: false,
      real_data_mutated: false,
      production_contacted: false,
      owner_approval_created: false,
    },
  };
  const summary = Object.freeze({
    ...summaryMaterial,
    bundle_sha256: sha256(summaryMaterial),
  });
  return Object.freeze({
    record_type_catalog: recordTypeCatalog,
    field_crosswalk: fieldCrosswalk,
    authority_manifest: authorityManifest,
    migration_dry_run: migrationDryRun,
    reconciliation,
    inventory_delta: inventoryDelta,
    summary,
  });
}
