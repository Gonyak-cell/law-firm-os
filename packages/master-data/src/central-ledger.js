import { hashDomainValue } from "../../persistence/src/domain-ledger.js";
import { createRecordDomainDescriptor } from "../../persistence/src/record-domain-adapter.js";

export const MASTER_DATA_PRIMARY_ID_FIELDS = Object.freeze({
  Party: "party_id",
  Entity: "entity_id",
  Person: "person_id",
  Organization: "organization_id",
  PartyAlias: "party_alias_id",
  PartyIdentifier: "party_identifier_id",
  ClientGroup: "client_group_id",
  Relationship: "relationship_id",
  ContactPoint: "contact_point_id",
  BillingProfile: "billing_profile_id",
});

function ref(reference_name, target_record_type, target_record_id, required = false) {
  if (!target_record_id) return null;
  return { reference_name, target_record_type, target_record_id, required };
}

function references(record) {
  const values = [];
  const add = (...args) => {
    const value = ref(...args);
    if (value) values.push(value);
  };
  if (["Person", "Organization"].includes(record.model_type)) {
    add("entity", "Entity", record.entity_id, true);
    add("party", "Party", record.party_id);
  }
  if (record.model_type === "Party") add("canonical_entity", "Entity", record.canonical_entity_id);
  if (record.model_type === "Entity") add("canonical_client_group", "ClientGroup", record.canonical_client_group_id);
  if (["PartyAlias", "PartyIdentifier"].includes(record.model_type)) {
    add("party", "Party", record.party_id, true);
  }
  if (record.model_type === "ClientGroup") {
    add("primary_entity", "Entity", record.primary_entity_id);
    add("primary_party", "Party", record.primary_party_id);
    add("billing_profile", "BillingProfile", record.billing_profile_id);
    for (const entityId of record.member_entity_ids ?? []) add("member_entity", "Entity", entityId);
    for (const partyId of record.member_party_ids ?? []) add("member_party", "Party", partyId);
  }
  if (record.model_type === "Relationship") {
    add("from_entity", "Entity", record.from_entity_id, true);
    add("to_entity", "Entity", record.to_entity_id, true);
    add("from_party", "Party", record.from_party_id);
    add("to_party", "Party", record.to_party_id);
  }
  if (record.model_type === "ContactPoint") {
    add("owner_entity", "Entity", record.owner_entity_id, true);
    add("owner_party", "Party", record.owner_party_id);
  }
  if (record.model_type === "BillingProfile") {
    add("billing_entity", "Entity", record.billing_entity_id, true);
    add("client_group", "ClientGroup", record.client_group_id);
    add("legal_client_party", "Party", record.legal_client_party_id);
    add("billing_client_party", "Party", record.billing_client_party_id);
    add("billing_contact", "ContactPoint", record.billing_contact_point_id);
  }
  return values;
}

function uniqueKey(record) {
  const explicit = record.identity_key
    ?? record.normalized_alias_key
    ?? record.normalized_identifier_key;
  if (explicit) return `sha256:${hashDomainValue(explicit)}`;
  if (record.model_type === "ContactPoint") {
    return `sha256:${hashDomainValue({
      owner_entity_id: record.owner_entity_id,
      contact_type: record.contact_type,
      value: record.value,
    })}`;
  }
  return null;
}

export const MASTER_DATA_DOMAIN_DESCRIPTOR = createRecordDomainDescriptor({
  domain_id: "master-data",
  resolve_record_id(record) {
    const field = MASTER_DATA_PRIMARY_ID_FIELDS[record.model_type];
    return field ? record[field] : record.resource_id ?? record.id;
  },
  unique_key: uniqueKey,
  references,
  pii_fields: [
    "display_name",
    "legal_name",
    "email",
    "phone",
    "registration_number",
    "identifier_value",
    "contact.value",
  ],
  primary_key_fields: Object.values(MASTER_DATA_PRIMARY_ID_FIELDS),
  unique_rules: [
    "Party.identity_key",
    "Entity.identity_key",
    "Person.identity_key",
    "Organization.identity_key",
    "PartyAlias.normalized_alias_key",
    "PartyIdentifier.normalized_identifier_key",
    "ContactPoint.owner_type_value_hash",
  ],
  reference_rules: [
    "Person|Organization.entity_id->Entity",
    "PartyAlias|PartyIdentifier.party_id->Party",
    "ClientGroup.member_entity_ids->Entity",
    "Relationship.from_entity_id|to_entity_id->Entity",
    "ContactPoint.owner_entity_id->Entity",
    "BillingProfile.billing_entity_id->Entity",
  ],
});
