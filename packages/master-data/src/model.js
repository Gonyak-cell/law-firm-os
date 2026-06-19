import {
  MASTER_DATA_ENTITY_KINDS,
  MASTER_DATA_LIFECYCLE_STATUSES,
  MASTER_DATA_MODEL_DEFINITIONS,
  MASTER_DATA_RELATIONSHIP_DIRECTIONS,
  getMasterDataModelDefinition,
} from "./registry.js";

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

export function createMasterDataEntity(input) {
  if (!MASTER_DATA_ENTITY_KINDS.includes(input.entity_kind)) {
    throw new Error(`Entity kind must be one of ${MASTER_DATA_ENTITY_KINDS.join(", ")}`);
  }
  return freezeRecord({
    ...baseRecord("Entity", input),
    entity_id: input.entity_id,
    entity_kind: input.entity_kind,
    display_name: input.display_name,
    identity_key: input.identity_key ?? `${input.tenant_id}:${input.entity_kind}:${input.display_name.toLowerCase()}`,
  });
}

export function createMasterDataPerson(input) {
  return freezeRecord({
    ...baseRecord("Person", input),
    person_id: input.person_id,
    entity_id: input.entity_id,
    display_name: input.display_name,
    email: input.email ?? null,
    phone: input.phone ?? null,
    identity_key: input.identity_key ?? `${input.tenant_id}:person:${input.display_name.toLowerCase()}`,
  });
}

export function createMasterDataOrganization(input) {
  return freezeRecord({
    ...baseRecord("Organization", input),
    organization_id: input.organization_id,
    entity_id: input.entity_id,
    display_name: input.display_name,
    registration_number: input.registration_number ?? null,
    identity_key: input.identity_key ?? `${input.tenant_id}:organization:${input.display_name.toLowerCase()}`,
    security_attribute: input.security_attribute ?? "standard",
  });
}

export function createMasterDataClientGroup(input) {
  return freezeRecord({
    ...baseRecord("ClientGroup", input),
    client_group_id: input.client_group_id,
    display_name: input.display_name,
    member_entity_ids: Object.freeze([...(input.member_entity_ids ?? [])]),
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
    relationship_type: input.relationship_type,
    direction: input.direction,
    reporting_ref: input.reporting_ref ?? null,
  });
}

export function createMasterDataContactPoint(input) {
  return freezeRecord({
    ...baseRecord("ContactPoint", input),
    contact_point_id: input.contact_point_id,
    owner_entity_id: input.owner_entity_id,
    contact_type: input.contact_type,
    value: input.value,
  });
}

export function createMasterDataBillingProfile(input) {
  return freezeRecord({
    ...baseRecord("BillingProfile", input),
    billing_profile_id: input.billing_profile_id,
    billing_entity_id: input.billing_entity_id,
    display_name: input.display_name,
    client_group_id: input.client_group_id ?? null,
    tax_profile_ref: input.tax_profile_ref ?? null,
    external_account_ref: input.external_account_ref ?? null,
  });
}

const FACTORIES = Object.freeze({
  Entity: createMasterDataEntity,
  Person: createMasterDataPerson,
  Organization: createMasterDataOrganization,
  ClientGroup: createMasterDataClientGroup,
  Relationship: createMasterDataRelationship,
  ContactPoint: createMasterDataContactPoint,
  BillingProfile: createMasterDataBillingProfile,
});

export function createMasterDataRecord(modelType, input) {
  const factory = FACTORIES[modelType];
  if (!factory) throw new Error(`Unknown Master Data model type ${modelType}`);
  return factory(input);
}

export function createMasterDataSyntheticFixture() {
  const tenant_id = "tenant_rp04_synthetic";
  const owner_user_id = "user_rp04_owner";
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
    records: Object.freeze([entity, organization, personEntity, person, clientGroup, relationship, contactPoint, billingProfile]),
    synthetic_only: true,
    uses_real_client_data: false,
    writes_product_state: false,
    evaluates_runtime_permission: false,
    writes_audit_event: false,
  });
}

export { missingRequiredFields };
