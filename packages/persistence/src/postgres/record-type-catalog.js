import { createHash } from "node:crypto";
import { DOMAIN_IDS } from "../domain-ledger.js";
import {
  isSafeCredentialPersistenceField,
} from "../credential-reference.js";

export const JSON_POSTGRES_RECORD_TYPE_CATALOG_VERSION = "law-firm-os.json-postgres-record-type-catalog.v1";
export const JSON_POSTGRES_RECORD_DESTINATIONS = Object.freeze([
  "generic-ledger",
  "identity-ledger",
  "s3-dms-object",
  "derived-rebuild",
  "archive-only",
  "reject",
]);
export const JSON_POSTGRES_ENTITY_KINDS = Object.freeze([
  "other",
  "account",
  "employee",
  "employee-user-link",
  "professional-profile",
  "career-entry",
  "education-entry",
  "qualification-entry",
  "client",
  "party",
  "matter",
  "dms-object",
  "finance",
  "portal",
]);

const DOMAIN_ID_SET = new Set(DOMAIN_IDS);
const DESTINATION_SET = new Set(JSON_POSTGRES_RECORD_DESTINATIONS);
const ENTITY_KIND_SET = new Set(JSON_POSTGRES_ENTITY_KINDS);
const FORBIDDEN_FIELD = /(^|_)(?:password|password_hash|passwd|passphrase|secret|token|credential|authorization|api_key|private_key|recovery_key|document_bytes|raw_bytes|raw_payload)(_|$)/iu;
const SAFE_NAME = /^[A-Za-z0-9_.:-]{1,128}$/u;

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

function requiredName(value, label) {
  const text = String(value ?? "").trim();
  if (!SAFE_NAME.test(text)) throw new TypeError(`${label} is invalid`);
  return text;
}

function valueType(value) {
  if (value === null) return "null";
  if (Array.isArray(value)) return "array";
  if (Buffer.isBuffer(value) || ArrayBuffer.isView(value)) return "bytes";
  return typeof value;
}

function inspectShape(value, path = "$", depth = 0, fields = new Map()) {
  if (depth > 24) throw new TypeError("record payload exceeds the maximum catalog depth");
  const type = valueType(value);
  if (!fields.has(path)) fields.set(path, new Set());
  fields.get(path).add(type);
  if (type === "bytes") throw new TypeError(`${path} contains raw bytes`);
  if (type === "array") {
    for (const item of value) inspectShape(item, `${path}[]`, depth + 1, fields);
    return fields;
  }
  if (type !== "object") return fields;
  for (const [key, item] of Object.entries(value)) {
    if (
      FORBIDDEN_FIELD.test(key)
      && !isSafeCredentialPersistenceField(key, item)
    ) {
      throw new TypeError(`${path}.${key} contains a forbidden secret or raw-byte field`);
    }
    inspectShape(item, `${path}.${key}`, depth + 1, fields);
  }
  return fields;
}

function catalogMaterial(value) {
  return {
    schema_version: value.schema_version,
    entries: value.entries,
    claims: value.claims,
  };
}

function normalizeDestination(value, fallback) {
  const destination = String(value ?? fallback);
  if (!DESTINATION_SET.has(destination)) throw new TypeError(`unsupported record destination: ${destination}`);
  return destination;
}

function inferredEntityKind(domainId, recordType) {
  const type = recordType.toLowerCase().replaceAll(/[^a-z0-9]/gu, "");
  if (domainId === "identity") return "account";
  if (domainId === "hrx" && /employee.*user.*link|user.*employee.*link/u.test(type)) return "employee-user-link";
  if (domainId === "hrx" && type === "hrxemploymentprofiles") return "professional-profile";
  if (domainId === "hrx" && /professional.*profile/u.test(type)) return "professional-profile";
  if (domainId === "hrx" && /career|experience/u.test(type)) return "career-entry";
  if (domainId === "hrx" && /education/u.test(type)) return "education-entry";
  if (domainId === "hrx" && /qualification|license|certification/u.test(type)) return "qualification-entry";
  if (domainId === "hrx" && /employee|member|personnel/u.test(type)) return "employee";
  if (domainId === "master-data" && /client/u.test(type)) return "client";
  if (domainId === "master-data" && /party|entity/u.test(type)) return "party";
  if (domainId === "matter" && type === "matterclient") return "client";
  if (domainId === "matter" && type === "matter") return "matter";
  if (
    domainId === "dms"
    || domainId === "dms-auxiliary"
    || domainId === "email-dms"
  ) return "dms-object";
  if (domainId === "finance") return "finance";
  if (domainId === "client-portal") return "portal";
  return "other";
}

function normalizeEntityKind(value, fallback) {
  const kind = String(value ?? fallback);
  if (!ENTITY_KIND_SET.has(kind)) throw new TypeError(`unsupported entity kind: ${kind}`);
  return kind;
}

function overrideFor(overrides, domainId, recordType) {
  return overrides?.[`${domainId}:${recordType}`] ?? {};
}

function identityCatalogPayload(account = {}, tenantId = null) {
  const membership = account.membership ?? account.tenant_memberships?.[0] ?? {};
  const accountStatus = account.account_status === "disabled"
    || account.status === "disabled"
    || membership.status === "disabled"
    ? "disabled"
    : "active";
  return {
    user_id: account.user_id,
    email: account.email,
    account_status: accountStatus,
    credential_provider: "lawos-internal-password-provider-v1",
    credential_status: accountStatus === "disabled" ? "disabled" : "reset_required",
    credential_rev: Number(account.credential_rev ?? 1),
    profile: account.profile ?? {},
    membership: {
      tenant_id: membership.tenant_id ?? tenantId,
      status: membership.status ?? accountStatus,
      role_profile_id: membership.role_profile_id ?? account.role_profile_id ?? null,
      role_ids: membership.role_ids ?? account.role_ids ?? [],
      group_ids: membership.group_ids ?? account.group_ids ?? [],
      scopes: membership.scopes ?? account.scopes ?? [],
      hrx_scopes: membership.hrx_scopes ?? account.hrx_scopes ?? [],
      source_ref: membership.source_ref ?? account.source_ref ?? null,
    },
  };
}

function catalogEntry({ domainId, recordType, destination, entityKind, records }) {
  const fields = new Map();
  const referenceRules = new Map();
  let uniqueKeyCount = 0;
  for (const record of records) {
    inspectShape(record.payload ?? {}, "$", 0, fields);
    if (record.unique_key) uniqueKeyCount += 1;
    for (const reference of record.references ?? []) {
      const name = requiredName(reference.reference_name, "reference name");
      const rule = {
        reference_name: name,
        target_domain_id: requiredName(reference.target_domain_id, "reference target domain"),
        target_record_type: requiredName(reference.target_record_type, "reference target record type"),
      };
      const key = stableJson(rule);
      const existing = referenceRules.get(key);
      referenceRules.set(key, { ...rule, count: Number(existing?.count ?? 0) + 1 });
    }
  }
  return Object.freeze({
    domain_id: domainId,
    record_type: recordType,
    destination,
    entity_kind: entityKind,
    tenant_derivation: "migration-corpus-tenant",
    tenant_required: true,
    record_id_strategy: "explicit-source-id",
    state_version_source: "source-or-one",
    optimistic_concurrency: "expected-version",
    additional_fields: "deny-unapproved-shape",
    record_count: records.length,
    unique_key_required: records.length > 0 && uniqueKeyCount === records.length,
    write_expectations: Object.freeze({
      idempotency: true,
      audit: true,
      outbox: true,
    }),
    lookup_index_policy: "measure-in-w12-before-index",
    fields: Object.freeze([...fields.entries()]
      .map(([path, types]) => Object.freeze({ path, types: Object.freeze([...types].sort()) }))
      .sort((left, right) => left.path.localeCompare(right.path))),
    references: Object.freeze([...referenceRules.values()]
      .map(({ count, ...rule }) => Object.freeze({
        ...rule,
        required_per_record: records.length > 0 && count === records.length,
      }))
      .sort((left, right) => left.reference_name.localeCompare(right.reference_name)
        || left.target_domain_id.localeCompare(right.target_domain_id)
        || left.target_record_type.localeCompare(right.target_record_type))),
  });
}

export function createJsonPostgresRecordTypeCatalog({ corpus = {}, overrides = {} } = {}) {
  const grouped = new Map();
  for (const account of corpus.accounts ?? []) {
    inspectShape(account, "$source");
    const key = "identity:Account";
    if (!grouped.has(key)) grouped.set(key, []);
    grouped.get(key).push({ payload: identityCatalogPayload(account, corpus.tenant_id), references: [], unique_key: account.email ?? null });
  }
  for (const domain of corpus.domains ?? []) {
    const domainId = requiredName(domain.domain_id, "catalog domain id");
    if (!DOMAIN_ID_SET.has(domainId)) throw new TypeError(`unsupported catalog domain: ${domainId}`);
    for (const record of domain.records ?? []) {
      const recordType = requiredName(record.record_type, "catalog record type");
      const key = `${domainId}:${recordType}`;
      if (!grouped.has(key)) grouped.set(key, []);
      grouped.get(key).push(record);
    }
  }
  const entries = [...grouped.entries()].map(([key, records]) => {
    const separator = key.indexOf(":");
    const domainId = key.slice(0, separator);
    const recordType = key.slice(separator + 1);
    const override = overrideFor(overrides, domainId, recordType);
    const fallback = domainId === "identity" ? "identity-ledger" : "generic-ledger";
    return catalogEntry({
      domainId,
      recordType,
      destination: normalizeDestination(override.destination, fallback),
      entityKind: normalizeEntityKind(override.entity_kind, inferredEntityKind(domainId, recordType)),
      records,
    });
  }).sort((left, right) => left.domain_id.localeCompare(right.domain_id) || left.record_type.localeCompare(right.record_type));
  const catalog = Object.freeze({
    schema_version: JSON_POSTGRES_RECORD_TYPE_CATALOG_VERSION,
    entries: Object.freeze(entries),
    claims: Object.freeze({
      raw_value_returned: false,
      pii_returned: false,
      secret_material_returned: false,
      dms_bytes_in_jsonb: false,
      dual_write_authorized: false,
    }),
  });
  return Object.freeze({ ...catalog, catalog_sha256: sha256(catalogMaterial(catalog)) });
}

export function validateJsonPostgresRecordTypeCatalog(catalog = {}) {
  if (catalog.schema_version !== JSON_POSTGRES_RECORD_TYPE_CATALOG_VERSION) throw new TypeError("record-type catalog schema is invalid");
  if (!Array.isArray(catalog.entries)) throw new TypeError("record-type catalog entries are required");
  const keys = new Set();
  for (const entry of catalog.entries) {
    const domainId = requiredName(entry.domain_id, "catalog entry domain");
    if (domainId !== "identity" && !DOMAIN_ID_SET.has(domainId)) throw new TypeError(`unsupported catalog entry domain: ${domainId}`);
    const recordType = requiredName(entry.record_type, "catalog entry record type");
    normalizeDestination(entry.destination, domainId === "identity" ? "identity-ledger" : "generic-ledger");
    normalizeEntityKind(entry.entity_kind, inferredEntityKind(domainId, recordType));
    if (entry.tenant_derivation !== "migration-corpus-tenant" || entry.tenant_required !== true) {
      throw new TypeError("catalog tenant authority contract is invalid");
    }
    if (entry.record_id_strategy !== "explicit-source-id"
      || entry.state_version_source !== "source-or-one"
      || entry.optimistic_concurrency !== "expected-version"
      || entry.additional_fields !== "deny-unapproved-shape") {
      throw new TypeError("catalog record identity or concurrency contract is invalid");
    }
    if (entry.write_expectations?.idempotency !== true
      || entry.write_expectations?.audit !== true
      || entry.write_expectations?.outbox !== true) {
      throw new TypeError("catalog write expectations are invalid");
    }
    if (entry.lookup_index_policy !== "measure-in-w12-before-index") {
      throw new TypeError("catalog lookup index policy is invalid");
    }
    const key = `${domainId}:${recordType}`;
    if (keys.has(key)) throw new TypeError(`duplicate catalog entry: ${key}`);
    keys.add(key);
    for (const field of entry.fields ?? []) {
      if (typeof field.path !== "string" || !field.path.startsWith("$")) throw new TypeError("catalog field path is invalid");
      if (!Array.isArray(field.types) || field.types.length === 0 || field.types.some((type) => type === "bytes")) {
        throw new TypeError("catalog field types are invalid");
      }
    }
    for (const reference of entry.references ?? []) {
      requiredName(reference.reference_name, "catalog reference name");
      requiredName(reference.target_domain_id, "catalog reference target domain");
      requiredName(reference.target_record_type, "catalog reference target record type");
      if (typeof reference.required_per_record !== "boolean") {
        throw new TypeError("catalog reference required flag is invalid");
      }
    }
  }
  if (catalog.claims?.raw_value_returned !== false
    || catalog.claims?.pii_returned !== false
    || catalog.claims?.secret_material_returned !== false
    || catalog.claims?.dms_bytes_in_jsonb !== false
    || catalog.claims?.dual_write_authorized !== false) {
    throw new TypeError("record-type catalog safety claims are invalid");
  }
  const digest = sha256(catalogMaterial(catalog));
  if (catalog.catalog_sha256 !== digest) throw new TypeError("record-type catalog digest mismatch");
  return Object.freeze({ valid: true, catalog_sha256: digest, entry_count: catalog.entries.length });
}

export function validateMigrationCorpusAgainstRecordTypeCatalog({ corpus = {}, catalog = {} } = {}) {
  validateJsonPostgresRecordTypeCatalog(catalog);
  const observed = createJsonPostgresRecordTypeCatalog({
    corpus,
    overrides: Object.fromEntries(catalog.entries.map((entry) => [
      `${entry.domain_id}:${entry.record_type}`,
      { destination: entry.destination, entity_kind: entry.entity_kind },
    ])),
  });
  const expectedByKey = new Map(catalog.entries.map((entry) => [`${entry.domain_id}:${entry.record_type}`, entry]));
  const unapprovedRecordTypes = [];
  const fieldTypeDrifts = [];
  const referenceRuleDrifts = [];
  const uniqueKeyDrifts = [];
  for (const entry of observed.entries) {
    const key = `${entry.domain_id}:${entry.record_type}`;
    const expected = expectedByKey.get(key);
    if (!expected) {
      unapprovedRecordTypes.push(key);
      continue;
    }
    if (entry.entity_kind !== expected.entity_kind) fieldTypeDrifts.push(`${key}:entity-kind`);
    const expectedFields = new Map((expected.fields ?? []).map((field) => [field.path, new Set(field.types)]));
    for (const field of entry.fields) {
      const types = expectedFields.get(field.path);
      if (!types || field.types.some((type) => !types.has(type))) fieldTypeDrifts.push(`${key}:${field.path}`);
    }
    const expectedReferences = new Set((expected.references ?? []).map(stableJson));
    for (const reference of entry.references) {
      if (!expectedReferences.has(stableJson(reference))) referenceRuleDrifts.push(`${key}:${reference.reference_name}`);
    }
    const observedReferences = new Set(entry.references.map(stableJson));
    for (const reference of expected.references ?? []) {
      if (reference.required_per_record && !observedReferences.has(stableJson(reference))) {
        referenceRuleDrifts.push(`${key}:${reference.reference_name}:required`);
      }
    }
    if (expected.unique_key_required && !entry.unique_key_required) uniqueKeyDrifts.push(key);
  }

  const targets = new Set();
  for (const domain of corpus.domains ?? []) {
    for (const record of domain.records ?? []) targets.add(`${domain.domain_id}:${record.record_type}:${record.record_id}`);
  }
  const missingReferences = [];
  for (const domain of corpus.domains ?? []) {
    for (const record of domain.records ?? []) {
      for (const reference of record.references ?? []) {
        const target = `${reference.target_domain_id}:${reference.target_record_type}:${reference.target_record_id}`;
        if (!targets.has(target)) missingReferences.push(sha256({
          source: `${domain.domain_id}:${record.record_type}:${record.record_id}`,
          reference_name: reference.reference_name,
          target,
        }).slice(0, 32));
      }
    }
  }
  const result = Object.freeze({
    valid: unapprovedRecordTypes.length === 0
      && fieldTypeDrifts.length === 0
      && referenceRuleDrifts.length === 0
      && uniqueKeyDrifts.length === 0
      && missingReferences.length === 0,
    catalog_sha256: catalog.catalog_sha256,
    observed_entry_count: observed.entries.length,
    unapproved_record_type_count: unapprovedRecordTypes.length,
    field_type_drift_count: fieldTypeDrifts.length,
    reference_rule_drift_count: referenceRuleDrifts.length,
    unique_key_drift_count: uniqueKeyDrifts.length,
    missing_reference_count: missingReferences.length,
    missing_reference_refs: Object.freeze(missingReferences.sort()),
    raw_value_returned: false,
    secret_material_returned: false,
  });
  return result;
}
