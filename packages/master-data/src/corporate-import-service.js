import { createDomainSnapshot, hashDomainValue } from "../../persistence/src/domain-ledger.js";
import { createRecordRepositoryDomainSnapshot } from "../../persistence/src/record-domain-adapter.js";
import { MASTER_DATA_DOMAIN_DESCRIPTOR, MASTER_DATA_PRIMARY_ID_FIELDS } from "./central-ledger.js";
import { createMasterDataRecord } from "./model.js";
import { createMasterDataRepository } from "./repository.js";
import { createOrganizationService } from "./organization-service.js";
import { createContactPointService } from "./contact-point-service.js";
import { createRelationshipService } from "./relationship-service.js";
import { createBillingProfileService } from "./billing-profile-service.js";
import { createPartyIdentifierService } from "./identifier-service.js";

export const CORPORATE_IMPORT_ACTION = "lawos-corporate-master-data-import";
export const CORPORATE_IMPORT_VERSION = "law-firm-os.corporate-master-data-import.v1";
const FIELDS = Object.freeze({
  Party: ["party_type", "display_name", "canonical_entity_id"],
  Entity: ["entity_kind", "display_name", "canonical_display_name", "legal_form"],
  Organization: ["party_id", "entity_id", "display_name", "canonical_display_name", "legal_form", "registration_number"],
  Person: ["party_id", "entity_id", "display_name", "canonical_display_name", "email", "phone"],
  PartyIdentifier: ["party_id", "identifier_type", "identifier_value", "jurisdiction", "verified"],
  ContactPoint: ["owner_entity_id", "owner_party_id", "contact_type", "value", "is_primary", "verified", "verification_status"],
  Relationship: ["from_entity_id", "to_entity_id", "from_party_id", "to_party_id", "relationship_type", "direction", "reporting_ref"],
  BillingProfile: ["billing_entity_id", "display_name", "legal_client_party_id", "billing_client_party_id", "billing_contact_point_id", "tax_profile_ref", "external_account_ref"],
});
const id = (value) => `${value.model_type}:${value[MASTER_DATA_PRIMARY_ID_FIELDS[value.model_type]]}`;
const equal = (a, b) => hashDomainValue(a) === hashDomainValue(b);
const text = (value) => typeof value === "string" && value.trim() === value && value.length > 0;
const digest = (value) => /^[a-f0-9]{64}$/.test(value);
export function assertCorporateImport(condition, code) {
  if (!condition) throw Object.assign(new Error("corporate import precondition failed"), { code: `LAWOS_CORPORATE_IMPORT_${code}`, status: 409 });
}
const requireCondition = assertCorporateImport;

export function validateCorporateImportManifest(manifest) {
  requireCondition(manifest?.schema_version === CORPORATE_IMPORT_VERSION && text(manifest.tenant_id)
    && text(manifest.actor_id) && ["synthetic-test", "lawos-private-rehearsal", "lawos-production"].includes(manifest.environment)
    && /^[a-f0-9]{40}$/.test(manifest.source_sha) && /^[a-f0-9]{40}$/.test(manifest.source_tree), "MANIFEST");
  requireCondition(Array.isArray(manifest.bindings) && manifest.bindings.length > 0
    && Array.isArray(manifest.documents) && manifest.documents.length > 0
    && Array.isArray(manifest.operations) && manifest.operations.length > 0, "MANIFEST");
  requireCondition(new Set(manifest.bindings.map((item) => item.legal_entity_id)).size === manifest.bindings.length
    && new Set(manifest.documents.map((item) => item.source_id)).size === manifest.documents.length
    && new Set(manifest.operations.map((item) => `${item.model_type}:${item.record_id}`)).size === manifest.operations.length, "DUPLICATE_TARGET");
  for (const binding of manifest.bindings) {
    requireCondition(["legal_entity_id", "organization_id", "party_id", "permission_ref", "owner_user_id", "matter_id",
      "workspace_id", "permission_envelope_id"].every((field) => text(binding[field]))
      && (binding.record_matter_id === null || text(binding.record_matter_id)), "BINDING");
  }
  for (const document of manifest.documents) {
    requireCondition(["source_id", "legal_entity_id", "document_id", "version_id", "file_object_id", "object_id", "content_type"]
      .every((field) => text(document[field])) && digest(document.sha256)
      && Number.isSafeInteger(document.byte_size) && document.byte_size > 0
      && Number.isSafeInteger(document.page_count) && document.page_count > 0
      && manifest.bindings.some((item) => item.legal_entity_id === document.legal_entity_id), "DOCUMENT");
  }
  for (const operation of manifest.operations) {
    requireCondition(Object.hasOwn(FIELDS, operation.model_type) && text(operation.record_id)
      && manifest.bindings.some((item) => item.legal_entity_id === operation.legal_entity_id)
      && (operation.before_payload_sha256 === null || digest(operation.before_payload_sha256)), "OPERATION");
    requireCondition(operation.values && Object.keys(operation.values).length > 0
      && Object.entries(operation.values).every(([field, value]) => FIELDS[operation.model_type].includes(field)
        && (value === null || typeof value === "string" || typeof value === "boolean")), "FIELD_NOT_SUPPORTED");
    requireCondition(operation.expected_values && (operation.before_payload_sha256 === null
      ? Object.keys(operation.expected_values).length === 0
      : equal(Object.keys(operation.expected_values).sort(), Object.keys(operation.values).sort())), "FIELD_CAS_REQUIRED");
    requireCondition(Array.isArray(operation.evidence) && operation.evidence.length > 0, "FIELD_EVIDENCE_REQUIRED");
    for (const item of operation.evidence) {
      const source = manifest.documents.find((document) => document.source_id === item.source_id);
      requireCondition(source && source.legal_entity_id === operation.legal_entity_id
        && Number.isSafeInteger(item.page) && item.page > 0 && item.page <= source.page_count
        && Array.isArray(item.fields) && item.fields.length > 0
        && item.fields.every((field) => Object.hasOwn(operation.values, field)), "FIELD_EVIDENCE_INVALID");
    }
    requireCondition(Object.keys(operation.values).every((field) => operation.evidence.some((item) => item.fields.includes(field))), "FIELD_EVIDENCE_REQUIRED");
  }
  return manifest;
}

export function corporateImportRecordsHash(snapshot) {
  return createDomainSnapshot({ tenant_id: snapshot.tenant_id, domain_id: "master-data", records: snapshot.records }).snapshot_hash;
}

// Provenance lives in the existing append-only audit, so model factories never discard new evidence fields.
export function prepareCorporateMasterDataImport({ manifest, currentSnapshot }) {
  validateCorporateImportManifest(manifest);
  const before = createDomainSnapshot(currentSnapshot);
  requireCondition(before.tenant_id === manifest.tenant_id && before.domain_id === "master-data"
    && before.records.every((record) => record.tenant_id === manifest.tenant_id && record.payload.tenant_id === manifest.tenant_id
      && record.payload.model_type === record.record_type), "TENANT");
  const manifestHash = hashDomainValue(manifest);
  const eventId = `corporate-import:${manifestHash}`;
  const byId = new Map(before.records.map((record) => [`${record.record_type}:${record.record_id}`, record]));
  const payloads = new Map(before.records.map((record) => [`${record.record_type}:${record.record_id}`, record.payload]));
  const evidence = [];
  for (const operation of manifest.operations) {
    const key = `${operation.model_type}:${operation.record_id}`;
    const current = byId.get(key);
    const binding = manifest.bindings.find((item) => item.legal_entity_id === operation.legal_entity_id);
    requireCondition((current?.payload_hash ?? null) === operation.before_payload_sha256 && !current?.append_only, "BASELINE_DRIFT");
    if (current) {
      requireCondition(current.payload.permission_ref === binding.permission_ref && current.payload.matter_id === binding.record_matter_id
        && current.payload.owner_user_id === binding.owner_user_id, "RECORD_AUTHORITY");
      requireCondition(Object.entries(operation.expected_values).every(([field, value]) => equal(current.payload[field] ?? null, value)), "FIELD_CAS_MISMATCH");
      // Existing graph edges and canonical identity remain stable; mapping changes need their own operation.
      requireCondition(Object.entries(operation.values).every(([field, value]) => !field.endsWith("_id")
        || current.payload[field] == null || equal(current.payload[field], value)), "IDENTITY_CHANGE");
    }
    const candidate = { ...(current?.payload ?? {}), ...structuredClone(operation.values), model_type: operation.model_type,
      tenant_id: manifest.tenant_id, [MASTER_DATA_PRIMARY_ID_FIELDS[operation.model_type]]: operation.record_id,
      ...(current ? {} : { status: "active", synthetic_only: manifest.environment === "synthetic-test", owner_user_id: binding.owner_user_id,
        matter_id: binding.record_matter_id, permission_ref: binding.permission_ref, audit_hint_ref: eventId }) };
    const identifierChanged = current && operation.model_type === "PartyIdentifier"
      && ["identifier_type", "identifier_value"].some((field) => Object.hasOwn(operation.values, field) && !equal(current.payload[field], operation.values[field]));
    const normalized = createMasterDataRecord(operation.model_type, { ...candidate, ...(identifierChanged ? { normalized_identifier_key: undefined } : {}) });
    requireCondition(Object.entries(operation.values).every(([field, value]) => Object.hasOwn(normalized, field) && equal(normalized[field], value)), "FIELD_NOT_PERSISTED");
    // Retain legacy fields and all untouched canonical values verbatim while validating the new fields through the factory.
    const payload = current ? { ...current.payload, ...structuredClone(operation.values),
      ...(identifierChanged ? { normalized_identifier_key: normalized.normalized_identifier_key } : {}) } : normalized;
    requireCondition(operation.model_type !== "Organization" || operation.record_id === binding.organization_id, "LEGAL_ENTITY_MAPPING");
    requireCondition(operation.model_type !== "Party" || payload.party_type !== "organization" || operation.record_id === binding.party_id, "LEGAL_ENTITY_MAPPING");
    requireCondition(operation.model_type !== "Entity" || payload.entity_kind !== "organization" || operation.record_id === binding.legal_entity_id, "LEGAL_ENTITY_MAPPING");
    payloads.set(key, payload);
    const fields = [...Object.keys(operation.values), ...(identifierChanged ? ["normalized_identifier_key"] : [])]
      .filter((field) => !equal(current?.payload[field], payload[field]));
    requireCondition(fields.length > 0 || !current, "NO_CHANGE");
    evidence.push({ record_type: operation.model_type, record_id: operation.record_id, legal_entity_id: binding.legal_entity_id,
      before_payload_sha256: current?.payload_hash ?? null, after_payload_sha256: hashDomainValue(payload),
      fields: fields.sort().map((field) => ({ field, before_value_sha256: hashDomainValue(current?.payload[field] ?? null),
        value_sha256: hashDomainValue(payload[field]), ...(field === "normalized_identifier_key" ? { derived_from: ["identifier_type", "identifier_value"] } : {}),
        sources: operation.evidence.filter((item) => item.fields.includes(field)
          || (field === "normalized_identifier_key" && item.fields.some((name) => ["identifier_type", "identifier_value"].includes(name)))).map((item) => ({
          ...manifest.documents.find((document) => document.source_id === item.source_id), page: item.page,
          matter_id: binding.matter_id, workspace_id: binding.workspace_id, permission_envelope_id: binding.permission_envelope_id,
        })) })) });
  }
  const repository = createMasterDataRepository({ seedRecords: [...payloads.values()].filter((record) => record.model_type !== "OperationalAuthoritySmoke"), preserveSeedRecords: true });
  try {
    for (const operation of manifest.operations) {
      const payload = payloads.get(`${operation.model_type}:${operation.record_id}`);
      if (["Party", "Person", "Entity"].includes(operation.model_type)) {
        requireCondition(repository.list({ model_type: operation.model_type }).every((item) => id(item) === id(payload)
          || item.display_name.trim().toLowerCase() !== payload.display_name.trim().toLowerCase()), "IDENTITY_DUPLICATE");
      }
      const others = createMasterDataRepository({ seedRecords: repository.list().filter((item) => id(item) !== id(payload)), preserveSeedRecords: true });
      try {
        if (operation.model_type === "Organization") createOrganizationService({ repository: others }).create(payload);
        if (operation.model_type === "ContactPoint") createContactPointService({ repository: others }).create(payload);
        if (operation.model_type === "Relationship") createRelationshipService({ repository: others }).create(payload);
        if (operation.model_type === "BillingProfile") createBillingProfileService({ repository: others }).create(payload);
        if (operation.model_type === "PartyIdentifier") createPartyIdentifierService({ repository: others }).create(payload);
      } finally { others.close(); }
    }
    for (const binding of manifest.bindings) {
      const organization = payloads.get(`Organization:${binding.organization_id}`);
      const entity = payloads.get(`Entity:${binding.legal_entity_id}`);
      const party = payloads.get(`Party:${binding.party_id}`);
      requireCondition(organization?.entity_id === binding.legal_entity_id && organization.party_id === binding.party_id
        && entity?.entity_kind === "organization" && party?.party_type === "organization"
        && party.canonical_entity_id === binding.legal_entity_id, "LEGAL_ENTITY_MAPPING");
    }
    const proposed = createRecordRepositoryDomainSnapshot({ descriptor: MASTER_DATA_DOMAIN_DESCRIPTOR,
      repositories: [{ source_id: "approved-corporate-import", repository }], tenant_id: manifest.tenant_id }).snapshot;
    for (const operation of manifest.operations) {
      const payload = payloads.get(`${operation.model_type}:${operation.record_id}`);
      const pair = (entityId, partyId, kind) => {
        const entity = payloads.get(`Entity:${entityId}`);
        const party = partyId ? payloads.get(`Party:${partyId}`) : null;
        requireCondition(entity && (!kind || entity.entity_kind === kind)
          && (!partyId || (party && party.canonical_entity_id === entityId && party.party_type === entity.entity_kind)), "TYPED_REFERENCE");
        return entity;
      };
      if (["Person", "Organization"].includes(operation.model_type)) pair(payload.entity_id, payload.party_id, operation.model_type.toLowerCase());
      if (operation.model_type === "Party") pair(payload.canonical_entity_id, payload.party_id, payload.party_type);
      if (operation.model_type === "ContactPoint") pair(payload.owner_entity_id, payload.owner_party_id);
      if (operation.model_type === "Relationship") {
        const from = pair(payload.from_entity_id, payload.from_party_id);
        const to = pair(payload.to_entity_id, payload.to_party_id);
        requireCondition(payload.direction === `${from.entity_kind}_to_${to.entity_kind}`, "TYPED_REFERENCE");
      }
      if (operation.model_type === "BillingProfile") {
        pair(payload.billing_entity_id, payload.billing_client_party_id);
        const binding = manifest.bindings.find((item) => item.legal_entity_id === operation.legal_entity_id);
        requireCondition(payload.billing_entity_id === binding.legal_entity_id && payload.legal_client_party_id === binding.party_id, "TYPED_REFERENCE");
      }
      const ownerEntityId = payload.entity_id ?? payload.canonical_entity_id ?? payload.owner_entity_id ?? payload.billing_entity_id
        ?? payloads.get(`Party:${payload.party_id}`)?.canonical_entity_id;
      const directPerson = payloads.get(`Entity:${ownerEntityId}`)?.entity_kind === "person"
        && repository.list({ model_type: "Relationship" }).some((item) => item.status === "active"
          && ((item.from_entity_id === ownerEntityId && item.to_entity_id === operation.legal_entity_id && item.direction === "person_to_organization")
            || (item.to_entity_id === ownerEntityId && item.from_entity_id === operation.legal_entity_id && item.direction === "organization_to_person")));
      requireCondition(operation.model_type === "Relationship"
        ? [payload.from_entity_id, payload.to_entity_id].includes(operation.legal_entity_id)
        : ownerEntityId === operation.legal_entity_id || directPerson, "UNRELATED_RECORD");
      if (operation.model_type === "Relationship") {
        requireCondition(repository.list({ model_type: "Relationship" }).every((item) => item.relationship_id === operation.record_id
          || !["from_entity_id", "to_entity_id", "relationship_type", "direction"].every((field) => item[field] === payload[field])), "RELATIONSHIP_DUPLICATE");
      }
    }
    const records = proposed.records.map((record) => {
      const prior = byId.get(`${record.record_type}:${record.record_id}`);
      return prior && equal(prior.payload, record.payload) ? prior
        : { ...record, state_version: (prior?.state_version ?? 0) + 1 };
    });
    records.push(...before.records.filter((record) => record.record_type === "OperationalAuthoritySmoke"));
    const after = createDomainSnapshot({ ...before, source_hash: undefined, records });
    const material = { schema_version: CORPORATE_IMPORT_VERSION, action: CORPORATE_IMPORT_ACTION, environment: manifest.environment,
      source_sha: manifest.source_sha, source_tree: manifest.source_tree, manifest_sha256: manifestHash,
      tenant_ref_sha256: hashDomainValue(manifest.tenant_id), before_snapshot_sha256: before.snapshot_hash,
      after_records_sha256: corporateImportRecordsHash(after), before_record_count: before.records.length,
      after_record_count: after.records.length, changed_record_count: evidence.length,
      preserved_record_count: before.records.length - manifest.operations.filter((item) => item.before_payload_sha256 !== null).length,
      document_count: manifest.documents.length, field_evidence_sha256: hashDomainValue(evidence),
      record_deletion_count: 0, creates_client_group: false, identity_write: false, employment_write: false,
      permission_write: false, document_body_readback_verified: false };
    return { plan: Object.freeze({ ...material, packet_sha256: hashDomainValue(material) }), before, after, evidence, eventId };
  } finally { repository.close(); }
}
