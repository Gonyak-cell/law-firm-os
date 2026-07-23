import { createHash } from "node:crypto";
import {
  JSON_POSTGRES_FIELD_DISPOSITIONS,
  JSON_POSTGRES_SOURCE_INVENTORY_VERSION,
} from "./source-inventory.js";
import { validateJsonPostgresRecordTypeCatalog } from "./record-type-catalog.js";

export const JSON_POSTGRES_AUTHORITY_MANIFEST_VERSION = "law-firm-os.json-postgres-source-authority-manifest.v1";
export const JSON_POSTGRES_FIELD_CROSSWALK_VERSION = "law-firm-os.json-postgres-field-crosswalk.v1";
export const JSON_POSTGRES_INVENTORY_DELTA_VERSION = "law-firm-os.json-postgres-inventory-delta.v1";
export const JSON_POSTGRES_INVENTORY_DELTA_POLICY_VERSION =
  "law-firm-os.json-postgres-inventory-delta-policy.v1";

const FINAL_CLASSIFICATIONS = new Set(["authoritative", "superseded", "duplicate", "synthetic", "corrupt"]);
const FIELD_DISPOSITION_SET = new Set(JSON_POSTGRES_FIELD_DISPOSITIONS);
const SHA256 = /^[0-9a-f]{64}$/u;
const SAFE_REF = /^[A-Za-z0-9_.:-]{1,160}$/u;
const REASON_CODE = /^[A-Z][A-Z0-9_]{2,63}$/u;
const SECRET_FIELD = /(^|_)(?:password|password_hash|passwd|passphrase|secret|token|credential|authorization|api_key|private_key|recovery_key|document_bytes|raw_bytes|raw_payload)(_|$)/iu;
const SAFE_CREDENTIAL_METADATA = new Set(["credential_provider", "credential_status", "credential_rev"]);

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

export const JSON_POSTGRES_INVENTORY_DELTA_POLICY = Object.freeze({
  schema_version: JSON_POSTGRES_INVENTORY_DELTA_POLICY_VERSION,
  allowed_change_kinds: Object.freeze(["added", "changed", "removed"]),
  approved_roots_only: true,
  every_change_requires_owner_adjudication: true,
  automatic_authorization: false,
  source_selection_by_mtime: false,
  source_mutation_authorized: false,
});
export const JSON_POSTGRES_INVENTORY_DELTA_POLICY_SHA256 =
  sha256(JSON_POSTGRES_INVENTORY_DELTA_POLICY);

function requiredSha(value, label) {
  const digest = String(value ?? "");
  if (!SHA256.test(digest)) throw new TypeError(`${label} must be a SHA-256 digest`);
  return digest;
}

function requiredRef(value, label) {
  const ref = String(value ?? "").trim();
  if (!SAFE_REF.test(ref)) throw new TypeError(`${label} is invalid`);
  return ref;
}

function requiredReason(value) {
  const reason = String(value ?? "");
  if (!REASON_CODE.test(reason)) throw new TypeError("authority decision reason code is invalid");
  return reason;
}

function inventoryDigest(inventory) {
  return requiredSha(inventory.inventory_content_sha256 ?? inventory.inventory_sha256, "inventory digest");
}

function validateInventoryShape(inventory) {
  if (inventory?.schema_version !== JSON_POSTGRES_SOURCE_INVENTORY_VERSION) throw new TypeError("source inventory schema is invalid");
  if (!Array.isArray(inventory.sources) || !Array.isArray(inventory.roots)) throw new TypeError("source inventory is incomplete");
  return inventoryDigest(inventory);
}

function authorityMaterial(value) {
  return {
    schema_version: value.schema_version,
    authorization_state: value.authorization_state,
    inventory_content_sha256: value.inventory_content_sha256,
    approved_root_refs: value.approved_root_refs,
    record_type_catalog_sha256: value.record_type_catalog_sha256,
    field_crosswalk_sha256: value.field_crosswalk_sha256,
    sources: value.sources,
    counts: value.counts,
    claims: value.claims,
  };
}

function crosswalkMaterial(value) {
  return {
    schema_version: value.schema_version,
    inventory_content_sha256: value.inventory_content_sha256,
    record_type_catalog_sha256: value.record_type_catalog_sha256,
    fields: value.fields,
    counts: value.counts,
    claims: value.claims,
  };
}

function deltaMaterial(value) {
  return {
    schema_version: value.schema_version,
    base_manifest_sha256: value.base_manifest_sha256,
    current_inventory_content_sha256: value.current_inventory_content_sha256,
    approved_root_refs: value.approved_root_refs,
    changes: value.changes,
    counts: value.counts,
    claims: value.claims,
  };
}

export function createJsonPostgresFieldCrosswalk({
  inventory = {},
  recordTypeCatalog = {},
  overrides = [],
} = {}) {
  const inventoryContentSha256 = validateInventoryShape(inventory);
  validateJsonPostgresRecordTypeCatalog(recordTypeCatalog);
  const overrideByKey = new Map();
  for (const override of overrides) {
    const key = `${requiredRef(override.field_name, "crosswalk field name")}:${requiredRef(override.path_ref, "crosswalk path ref")}`;
    if (overrideByKey.has(key)) throw new TypeError(`duplicate crosswalk override: ${key}`);
    const disposition = String(override.disposition ?? "");
    if (!FIELD_DISPOSITION_SET.has(disposition)) throw new TypeError(`unsupported field disposition: ${disposition}`);
    overrideByKey.set(key, {
      disposition,
      reason_code: requiredReason(override.reason_code),
    });
  }
  const fields = (inventory.field_contract?.fields ?? []).map((field) => {
    const fieldName = requiredRef(field.field_name, "crosswalk field name");
    const pathRef = requiredRef(field.path_ref, "crosswalk path ref");
    const override = overrideByKey.get(`${fieldName}:${pathRef}`);
    const disposition = override?.disposition ?? field.disposition;
    if (!FIELD_DISPOSITION_SET.has(disposition)) throw new TypeError(`unsupported inventory field disposition: ${disposition}`);
    if (SECRET_FIELD.test(fieldName) && !SAFE_CREDENTIAL_METADATA.has(fieldName) && disposition !== "secret-excluded") {
      throw new TypeError(`secret field cannot be reclassified: ${fieldName}`);
    }
    return Object.freeze({
      field_name: fieldName,
      path_ref: pathRef,
      disposition,
      reason_code: override?.reason_code ?? "INVENTORY_DEFAULT",
    });
  }).sort((left, right) => left.field_name.localeCompare(right.field_name) || left.path_ref.localeCompare(right.path_ref));
  if (overrideByKey.size !== overrides.length || overrides.some((override) => !fields.some((field) => (
    field.field_name === override.field_name && field.path_ref === override.path_ref
  )))) {
    throw new TypeError("crosswalk override does not bind an inventory field");
  }
  const counts = Object.freeze(Object.fromEntries(JSON_POSTGRES_FIELD_DISPOSITIONS.map((disposition) => [
    disposition,
    fields.filter((field) => field.disposition === disposition).length,
  ])));
  const value = Object.freeze({
    schema_version: JSON_POSTGRES_FIELD_CROSSWALK_VERSION,
    inventory_content_sha256: inventoryContentSha256,
    record_type_catalog_sha256: recordTypeCatalog.catalog_sha256,
    fields: Object.freeze(fields),
    counts,
    claims: Object.freeze({
      silent_drop_count: 0,
      raw_value_returned: false,
      pii_returned: false,
      secret_material_returned: false,
    }),
  });
  return Object.freeze({ ...value, field_crosswalk_sha256: sha256(crosswalkMaterial(value)) });
}

export function validateJsonPostgresFieldCrosswalk(crosswalk = {}, { inventory, recordTypeCatalog } = {}) {
  if (crosswalk.schema_version !== JSON_POSTGRES_FIELD_CROSSWALK_VERSION) throw new TypeError("field crosswalk schema is invalid");
  if (!Array.isArray(crosswalk.fields)) throw new TypeError("field crosswalk fields are required");
  const rebuilt = createJsonPostgresFieldCrosswalk({
    inventory,
    recordTypeCatalog,
    overrides: crosswalk.fields
      .filter((field) => field.reason_code !== "INVENTORY_DEFAULT")
      .map((field) => ({
        field_name: field.field_name,
        path_ref: field.path_ref,
        disposition: field.disposition,
        reason_code: field.reason_code,
      })),
  });
  if (stableJson(rebuilt) !== stableJson(crosswalk)) throw new TypeError("field crosswalk does not match the exact inventory and catalog");
  return Object.freeze({ valid: true, field_crosswalk_sha256: crosswalk.field_crosswalk_sha256, field_count: crosswalk.fields.length });
}

export function createJsonPostgresSourceAuthorityManifest({
  inventory = {},
  decisions = [],
  approvedRootRefs = [],
  recordTypeCatalog,
  fieldCrosswalk,
} = {}) {
  const inventoryContentSha256 = validateInventoryShape(inventory);
  validateJsonPostgresRecordTypeCatalog(recordTypeCatalog);
  validateJsonPostgresFieldCrosswalk(fieldCrosswalk, { inventory, recordTypeCatalog });
  const approvedRoots = Object.freeze([...new Set(approvedRootRefs.map((ref) => requiredRef(ref, "approved root ref")))].sort());
  const approvedRootSet = new Set(approvedRoots);
  const bySourceRef = new Map(inventory.sources.map((source) => [source.source_ref, source]));
  const decisionBySource = new Map();
  for (const decision of decisions) {
    const sourceRef = requiredRef(decision.source_ref, "authority source ref");
    if (decisionBySource.has(sourceRef)) throw new TypeError(`duplicate authority decision: ${sourceRef}`);
    const source = bySourceRef.get(sourceRef);
    if (!source) throw new TypeError(`authority decision source is absent: ${sourceRef}`);
    if (requiredSha(decision.sha256, "authority decision source digest") !== source.sha256) {
      throw new TypeError(`authority decision source digest drifted: ${sourceRef}`);
    }
    const classification = String(decision.classification ?? "");
    if (!FINAL_CLASSIFICATIONS.has(classification)) throw new TypeError(`authority decision is not terminal: ${sourceRef}`);
    const rootRef = requiredRef(source.root_ref, "authority root ref");
    if (!approvedRootSet.has(rootRef)) throw new TypeError(`authority source root is not approved: ${rootRef}`);
    decisionBySource.set(sourceRef, Object.freeze({
      source_ref: sourceRef,
      root_ref: rootRef,
      source_family: requiredRef(source.source_family, "authority source family"),
      sha256: source.sha256,
      classification,
      reason_code: requiredReason(decision.reason_code),
      decision_ref: requiredRef(decision.decision_ref, "authority decision ref"),
    }));
  }
  const missing = inventory.sources.filter((source) => !decisionBySource.has(source.source_ref));
  if (missing.length > 0) throw new TypeError(`authority manifest has ${missing.length} unresolved source decisions`);
  const sources = Object.freeze([...decisionBySource.values()].sort((left, right) => left.source_ref.localeCompare(right.source_ref)));
  const authoritativeCount = sources.filter((source) => source.classification === "authoritative").length;
  if (inventory.sources.length > 0 && authoritativeCount === 0) throw new TypeError("authority manifest selects no authoritative source");
  const counts = Object.freeze({
    source_count: sources.length,
    authoritative_count: authoritativeCount,
    superseded_count: sources.filter((source) => source.classification === "superseded").length,
    duplicate_count: sources.filter((source) => source.classification === "duplicate").length,
    synthetic_count: sources.filter((source) => source.classification === "synthetic").length,
    corrupt_count: sources.filter((source) => source.classification === "corrupt").length,
    unresolved_count: 0,
  });
  const value = Object.freeze({
    schema_version: JSON_POSTGRES_AUTHORITY_MANIFEST_VERSION,
    authorization_state: "PENDING_OWNER_SIGNATURE",
    inventory_content_sha256: inventoryContentSha256,
    approved_root_refs: approvedRoots,
    record_type_catalog_sha256: recordTypeCatalog.catalog_sha256,
    field_crosswalk_sha256: fieldCrosswalk.field_crosswalk_sha256,
    sources,
    counts,
    claims: Object.freeze({
      authority_selected_by_mtime: false,
      raw_value_returned: false,
      pii_returned: false,
      secret_material_returned: false,
      real_data_mutated: false,
      production_contacted: false,
    }),
  });
  return Object.freeze({ ...value, manifest_sha256: sha256(authorityMaterial(value)) });
}

export function validateJsonPostgresSourceAuthorityManifest(manifest = {}, {
  inventory,
  recordTypeCatalog,
  fieldCrosswalk,
} = {}) {
  if (manifest.schema_version !== JSON_POSTGRES_AUTHORITY_MANIFEST_VERSION) throw new TypeError("authority manifest schema is invalid");
  if (!Array.isArray(manifest.sources) || !Array.isArray(manifest.approved_root_refs)) {
    throw new TypeError("authority manifest sources and approved roots are required");
  }
  const rebuilt = createJsonPostgresSourceAuthorityManifest({
    inventory,
    decisions: manifest.sources.map((source) => ({
      source_ref: source.source_ref,
      sha256: source.sha256,
      classification: source.classification,
      reason_code: source.reason_code,
      decision_ref: source.decision_ref,
    })),
    approvedRootRefs: manifest.approved_root_refs,
    recordTypeCatalog,
    fieldCrosswalk,
  });
  if (stableJson(rebuilt) !== stableJson(manifest)) throw new TypeError("authority manifest does not match the exact inventory, catalog, and crosswalk");
  return Object.freeze({
    valid: true,
    manifest_sha256: manifest.manifest_sha256,
    source_count: manifest.sources.length,
    unresolved_count: 0,
  });
}

export function createJsonPostgresInventoryDelta({ baseManifest = {}, currentInventory = {} } = {}) {
  if (baseManifest.schema_version !== JSON_POSTGRES_AUTHORITY_MANIFEST_VERSION) throw new TypeError("delta base authority manifest is invalid");
  if (!Array.isArray(baseManifest.sources) || !Array.isArray(baseManifest.approved_root_refs)) {
    throw new TypeError("delta base authority manifest is incomplete");
  }
  const currentInventoryContentSha256 = validateInventoryShape(currentInventory);
  const approvedRootRefs = Object.freeze([...baseManifest.approved_root_refs].sort());
  const approvedRoots = new Set(approvedRootRefs);
  const baseByRef = new Map(baseManifest.sources.map((source) => [source.source_ref, source]));
  const currentByRef = new Map(currentInventory.sources.map((source) => [source.source_ref, source]));
  const changes = [];
  for (const current of currentInventory.sources) {
    const base = baseByRef.get(current.source_ref);
    const kind = !base ? "added" : base.sha256 === current.sha256 ? "unchanged" : "changed";
    if (kind !== "unchanged") changes.push(Object.freeze({
      change: kind,
      source_ref: current.source_ref,
      root_ref: current.root_ref,
      prior_sha256: base?.sha256 ?? null,
      current_sha256: current.sha256,
      approved_root: approvedRoots.has(current.root_ref),
    }));
  }
  for (const base of baseManifest.sources) {
    if (!currentByRef.has(base.source_ref)) changes.push(Object.freeze({
      change: "removed",
      source_ref: base.source_ref,
      root_ref: base.root_ref,
      prior_sha256: base.sha256,
      current_sha256: null,
      approved_root: approvedRoots.has(base.root_ref),
    }));
  }
  changes.sort((left, right) => left.source_ref.localeCompare(right.source_ref));
  const reviewCount = changes.length;
  const unapprovedRootCount = changes.filter((change) => !change.approved_root).length;
  const value = Object.freeze({
    schema_version: JSON_POSTGRES_INVENTORY_DELTA_VERSION,
    base_manifest_sha256: requiredSha(baseManifest.manifest_sha256, "base authority manifest digest"),
    current_inventory_content_sha256: currentInventoryContentSha256,
    approved_root_refs: approvedRootRefs,
    changes: Object.freeze(changes),
    counts: Object.freeze({
      added_count: changes.filter((change) => change.change === "added").length,
      changed_count: changes.filter((change) => change.change === "changed").length,
      removed_count: changes.filter((change) => change.change === "removed").length,
      unapproved_root_count: unapprovedRootCount,
      requires_review_count: reviewCount,
    }),
    claims: Object.freeze({
      auto_authorized: false,
      delta_policy_sha256: JSON_POSTGRES_INVENTORY_DELTA_POLICY_SHA256,
      raw_value_returned: false,
      pii_returned: false,
      secret_material_returned: false,
      real_data_mutated: false,
    }),
  });
  return Object.freeze({ ...value, delta_sha256: sha256(deltaMaterial(value)) });
}
