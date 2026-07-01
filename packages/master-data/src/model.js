import {
  MASTER_DATA_CONTACT_POINT_TYPES,
  MASTER_DATA_ENTITY_KINDS,
  MASTER_DATA_LIFECYCLE_STATUSES,
  MASTER_DATA_MODEL_DEFINITIONS,
  MASTER_DATA_PARTY_ALIAS_TYPES,
  MASTER_DATA_PARTY_IDENTIFIER_TYPES,
  MASTER_DATA_PARTY_TYPES,
  MASTER_DATA_RELATIONSHIP_DIRECTIONS,
  getMasterDataModelDefinition,
} from "./registry.js";
import { AMIC_CURRENT_CLIENT_CANDIDATES } from "./amic-client-candidates.js";

function freezeRecord(record) {
  return Object.freeze(record);
}

function missingRequiredFields(modelType, input) {
  const definition = getMasterDataModelDefinition(modelType);
  return definition.required_fields.filter((field) => input?.[field] === undefined || input?.[field] === null || input?.[field] === "");
}

function assertRequiredFields(modelType, input) {
  const missing = missingRequiredFields(modelType, input);
  if (missing.length > 0) throw new Error(`${modelType} missing required fields: ${missing.join(", ")}`);
}

function assertLifecycleStatus(modelType, status) {
  if (!MASTER_DATA_LIFECYCLE_STATUSES.includes(status)) {
    throw new Error(`${modelType} status must be one of ${MASTER_DATA_LIFECYCLE_STATUSES.join(", ")}`);
  }
}

function normalizeSearchValue(value) {
  return String(value ?? "").trim().toLowerCase();
}

function baseRecord(modelType, input) {
  assertRequiredFields(modelType, input);
  assertLifecycleStatus(modelType, input.status);
  const definition = getMasterDataModelDefinition(modelType);
  return {
    model_type: modelType,
    tenant_id: input.tenant_id,
    status: input.status,
    owner_module: definition.owner_module,
    owner_user_id: input.owner_user_id ?? null,
    matter_id: input.matter_id ?? null,
    permission_ref: input.permission_ref ?? null,
    audit_hint_ref: input.audit_hint_ref ?? null,
    synthetic_only: input.synthetic_only ?? true,
    writes_product_state: false,
    evaluates_runtime_permission: false,
    writes_audit_event: false,
  };
}

export function createMasterDataParty(input) {
  if (!MASTER_DATA_PARTY_TYPES.includes(input.party_type)) {
    throw new Error(`Party type must be one of ${MASTER_DATA_PARTY_TYPES.join(", ")}`);
  }
  return freezeRecord({
    ...baseRecord("Party", input),
    party_id: input.party_id,
    party_type: input.party_type,
    display_name: input.display_name,
    canonical_entity_id: input.canonical_entity_id ?? null,
    identity_key: input.identity_key ?? `${input.tenant_id}:party:${input.party_type}:${normalizeSearchValue(input.display_name)}`,
  });
}

export function createMasterDataEntity(input) {
  if (!MASTER_DATA_ENTITY_KINDS.includes(input.entity_kind)) {
    throw new Error(`Entity kind must be one of ${MASTER_DATA_ENTITY_KINDS.join(", ")}`);
  }
  return freezeRecord({
    ...baseRecord("Entity", input),
    entity_id: input.entity_id,
    entity_kind: input.entity_kind,
    display_name: input.display_name,
    canonical_display_name: input.canonical_display_name ?? input.display_name,
    legal_form: input.legal_form ?? null,
    client_source_ref: input.client_source_ref ?? null,
    source_lanes: Object.freeze([...(input.source_lanes ?? [])]),
    identity_key: input.identity_key ?? `${input.tenant_id}:${input.entity_kind}:${input.display_name.toLowerCase()}`,
  });
}

export function createMasterDataPerson(input) {
  return freezeRecord({
    ...baseRecord("Person", input),
    person_id: input.person_id,
    party_id: input.party_id ?? null,
    entity_id: input.entity_id,
    display_name: input.display_name,
    canonical_display_name: input.canonical_display_name ?? input.display_name,
    legal_form: input.legal_form ?? null,
    client_source_ref: input.client_source_ref ?? null,
    source_lanes: Object.freeze([...(input.source_lanes ?? [])]),
    email: input.email ?? null,
    phone: input.phone ?? null,
    identity_key: input.identity_key ?? `${input.tenant_id}:person:${normalizeSearchValue(input.display_name)}`,
  });
}

export function createMasterDataOrganization(input) {
  return freezeRecord({
    ...baseRecord("Organization", input),
    organization_id: input.organization_id,
    party_id: input.party_id ?? null,
    entity_id: input.entity_id,
    display_name: input.display_name,
    canonical_display_name: input.canonical_display_name ?? input.display_name,
    legal_form: input.legal_form ?? null,
    client_source_ref: input.client_source_ref ?? null,
    source_lanes: Object.freeze([...(input.source_lanes ?? [])]),
    registration_number: input.registration_number ?? null,
    identity_key: input.identity_key ?? `${input.tenant_id}:organization:${normalizeSearchValue(input.display_name)}`,
    security_attribute: input.security_attribute ?? "standard",
  });
}

export function createMasterDataPartyAlias(input) {
  if (!MASTER_DATA_PARTY_ALIAS_TYPES.includes(input.alias_type)) {
    throw new Error(`PartyAlias type must be one of ${MASTER_DATA_PARTY_ALIAS_TYPES.join(", ")}`);
  }
  return freezeRecord({
    ...baseRecord("PartyAlias", input),
    party_alias_id: input.party_alias_id,
    party_id: input.party_id,
    alias_value: input.alias_value,
    alias_type: input.alias_type,
    locale: input.locale ?? null,
    normalized_alias_key:
      input.normalized_alias_key ??
      `${input.tenant_id}:party-alias:${input.party_id}:${input.locale ?? "und"}:${normalizeSearchValue(input.alias_value)}`,
  });
}

export function createMasterDataPartyIdentifier(input) {
  if (!MASTER_DATA_PARTY_IDENTIFIER_TYPES.includes(input.identifier_type)) {
    throw new Error(`PartyIdentifier type must be one of ${MASTER_DATA_PARTY_IDENTIFIER_TYPES.join(", ")}`);
  }
  return freezeRecord({
    ...baseRecord("PartyIdentifier", input),
    party_identifier_id: input.party_identifier_id,
    party_id: input.party_id,
    identifier_type: input.identifier_type,
    identifier_value: input.identifier_value,
    jurisdiction: input.jurisdiction ?? null,
    verified: input.verified ?? false,
    normalized_identifier_key:
      input.normalized_identifier_key ??
      `${input.tenant_id}:party-identifier:${input.identifier_type}:${normalizeSearchValue(input.identifier_value)}`,
  });
}

export function createMasterDataClientGroup(input) {
  return freezeRecord({
    ...baseRecord("ClientGroup", input),
    client_group_id: input.client_group_id,
    display_name: input.display_name,
    canonical_display_name: input.canonical_display_name ?? input.display_name,
    legal_form: input.legal_form ?? null,
    candidate_type: input.candidate_type ?? null,
    client_source_ref: input.client_source_ref ?? null,
    source_lanes: Object.freeze([...(input.source_lanes ?? [])]),
    member_entity_ids: Object.freeze([...(input.member_entity_ids ?? [])]),
    member_party_ids: Object.freeze([...(input.member_party_ids ?? [])]),
    primary_entity_id: input.primary_entity_id ?? null,
    primary_party_id: input.primary_party_id ?? null,
    billing_profile_id: input.billing_profile_id ?? null,
    confidentiality: input.confidentiality ?? "confidential",
  });
}

export function createMasterDataRelationship(input) {
  if (!MASTER_DATA_RELATIONSHIP_DIRECTIONS.includes(input.direction)) {
    throw new Error(`Relationship direction must be one of ${MASTER_DATA_RELATIONSHIP_DIRECTIONS.join(", ")}`);
  }
  return freezeRecord({
    ...baseRecord("Relationship", input),
    relationship_id: input.relationship_id,
    from_entity_id: input.from_entity_id,
    to_entity_id: input.to_entity_id,
    from_party_id: input.from_party_id ?? null,
    to_party_id: input.to_party_id ?? null,
    relationship_type: input.relationship_type,
    direction: input.direction,
    reporting_ref: input.reporting_ref ?? null,
  });
}

export function createMasterDataContactPoint(input) {
  if (!MASTER_DATA_CONTACT_POINT_TYPES.includes(input.contact_type)) {
    throw new Error(`ContactPoint type must be one of ${MASTER_DATA_CONTACT_POINT_TYPES.join(", ")}`);
  }
  return freezeRecord({
    ...baseRecord("ContactPoint", input),
    contact_point_id: input.contact_point_id,
    owner_entity_id: input.owner_entity_id,
    owner_party_id: input.owner_party_id ?? null,
    contact_type: input.contact_type,
    value: input.value,
    is_primary: input.is_primary ?? false,
    verified: input.verified ?? false,
    verification_status: input.verification_status ?? (input.verified === true ? "verified" : "unverified"),
  });
}

export function createMasterDataBillingProfile(input) {
  return freezeRecord({
    ...baseRecord("BillingProfile", input),
    billing_profile_id: input.billing_profile_id,
    billing_entity_id: input.billing_entity_id,
    display_name: input.display_name,
    client_group_id: input.client_group_id ?? null,
    legal_client_party_id: input.legal_client_party_id ?? null,
    billing_client_party_id: input.billing_client_party_id ?? null,
    billing_contact_point_id: input.billing_contact_point_id ?? null,
    tax_profile_ref: input.tax_profile_ref ?? null,
    external_account_ref: input.external_account_ref ?? null,
  });
}

const FACTORIES = Object.freeze({
  Party: createMasterDataParty,
  Entity: createMasterDataEntity,
  Person: createMasterDataPerson,
  Organization: createMasterDataOrganization,
  PartyAlias: createMasterDataPartyAlias,
  PartyIdentifier: createMasterDataPartyIdentifier,
  ClientGroup: createMasterDataClientGroup,
  Relationship: createMasterDataRelationship,
  ContactPoint: createMasterDataContactPoint,
  BillingProfile: createMasterDataBillingProfile,
});

const AMIC_CURRENT_CLIENT_SOURCE_REF = "amic_current_onedrive_folder_inventory_2026_07_01";

function clientCandidateEntityKind(candidate) {
  return candidate.candidate_type === "organization_candidate" ? "organization" : "person";
}

function createAmicCurrentClientCandidateRecords({ tenant_id, owner_user_id }) {
  return AMIC_CURRENT_CLIENT_CANDIDATES.flatMap((candidate, index) => {
    const sequence = String(index + 1).padStart(3, "0");
    const entityKind = clientCandidateEntityKind(candidate);
    const entity = createMasterDataEntity({
      entity_id: `entity_rp04_amic_client_${sequence}`,
      tenant_id,
      entity_kind: entityKind,
      display_name: candidate.display_name,
      canonical_display_name: candidate.canonical_display_name,
      legal_form: candidate.legal_form,
      candidate_type: candidate.candidate_type,
      client_source_ref: AMIC_CURRENT_CLIENT_SOURCE_REF,
      source_lanes: candidate.source_lanes,
      status: "active",
      owner_user_id,
      synthetic_only: false,
    });
    const party =
      entityKind === "organization"
        ? createMasterDataOrganization({
            organization_id: `org_rp04_amic_client_${sequence}`,
            tenant_id,
            entity_id: entity.entity_id,
            display_name: candidate.display_name,
            canonical_display_name: candidate.canonical_display_name,
            legal_form: candidate.legal_form,
            client_source_ref: AMIC_CURRENT_CLIENT_SOURCE_REF,
            source_lanes: candidate.source_lanes,
            status: "active",
            owner_user_id,
            synthetic_only: false,
          })
        : createMasterDataPerson({
            person_id: `person_rp04_amic_client_${sequence}`,
            tenant_id,
            entity_id: entity.entity_id,
            display_name: candidate.display_name,
            canonical_display_name: candidate.canonical_display_name,
            legal_form: candidate.legal_form,
            client_source_ref: AMIC_CURRENT_CLIENT_SOURCE_REF,
            source_lanes: candidate.source_lanes,
            status: "active",
            owner_user_id,
            synthetic_only: false,
          });
    const clientGroup = createMasterDataClientGroup({
      client_group_id: `client_group_rp04_amic_client_${sequence}`,
      tenant_id,
      display_name: candidate.display_name,
      canonical_display_name: candidate.canonical_display_name,
      legal_form: candidate.legal_form,
      candidate_type: candidate.candidate_type,
      client_source_ref: AMIC_CURRENT_CLIENT_SOURCE_REF,
      source_lanes: candidate.source_lanes,
      status: "active",
      owner_user_id,
      member_entity_ids: [entity.entity_id],
      primary_entity_id: entity.entity_id,
      synthetic_only: false,
    });
    return [entity, party, clientGroup];
  });
}

export function createMasterDataRecord(modelType, input) {
  const factory = FACTORIES[modelType];
  if (!factory) throw new Error(`Unknown Master Data model type ${modelType}`);
  return factory(input);
}

export function createMasterDataSyntheticFixture() {
  const tenant_id = "tenant_rp04_synthetic";
  const owner_user_id = "user_rp04_owner";
  const amicCurrentClientRecords = createAmicCurrentClientCandidateRecords({ tenant_id, owner_user_id });
  const entity = createMasterDataEntity({
    entity_id: "entity_rp04_org_amic",
    tenant_id,
    entity_kind: "organization",
    display_name: "AMIC Synthetic Client",
    status: "active",
    owner_user_id,
  });
  const organization = createMasterDataOrganization({
    organization_id: "org_rp04_amic",
    tenant_id,
    entity_id: entity.entity_id,
    display_name: entity.display_name,
    status: "active",
    owner_user_id,
  });
  const personEntity = createMasterDataEntity({
    entity_id: "entity_rp04_person_lee",
    tenant_id,
    entity_kind: "person",
    display_name: "Lee Synthetic Contact",
    status: "active",
    owner_user_id,
  });
  const person = createMasterDataPerson({
    person_id: "person_rp04_lee",
    tenant_id,
    entity_id: personEntity.entity_id,
    display_name: personEntity.display_name,
    status: "active",
    owner_user_id,
    email: "lee.synthetic@example.invalid",
  });
  const clientGroup = createMasterDataClientGroup({
    client_group_id: "client_group_rp04_amic",
    tenant_id,
    display_name: "AMIC Synthetic Group",
    status: "review_required",
    owner_user_id,
    member_entity_ids: [entity.entity_id, personEntity.entity_id],
  });
  const relationship = createMasterDataRelationship({
    relationship_id: "relationship_rp04_contact",
    tenant_id,
    from_entity_id: personEntity.entity_id,
    to_entity_id: entity.entity_id,
    relationship_type: "primary_contact",
    direction: "person_to_organization",
    status: "active",
    owner_user_id,
  });
  const contactPoint = createMasterDataContactPoint({
    contact_point_id: "contact_rp04_email",
    tenant_id,
    owner_entity_id: personEntity.entity_id,
    contact_type: "email",
    value: "lee.synthetic@example.invalid",
    status: "active",
    owner_user_id,
  });
  const billingProfile = createMasterDataBillingProfile({
    billing_profile_id: "billing_profile_rp04_amic",
    billing_entity_id: entity.entity_id,
    tenant_id,
    display_name: "AMIC Synthetic Billing",
    status: "draft",
    owner_user_id,
    client_group_id: clientGroup.client_group_id,
  });
  return freezeRecord({
    fixture_id: "master_data_cp156_synthetic_fixture",
    tenant_id,
    owner_user_id,
    records: Object.freeze([
      ...amicCurrentClientRecords,
      entity,
      organization,
      personEntity,
      person,
      clientGroup,
      relationship,
      contactPoint,
      billingProfile,
    ]),
    synthetic_only: false,
    uses_real_client_data: true,
    writes_product_state: false,
    evaluates_runtime_permission: false,
    writes_audit_event: false,
  });
}

export { missingRequiredFields };
