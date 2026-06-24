import { createClientGroupService } from "./client-group-service.js";
import { createContactPointService } from "./contact-point-service.js";
import { createOrganizationService } from "./organization-service.js";
import { createPersonService } from "./person-service.js";
import { createRelationshipService } from "./relationship-service.js";

const MASTER_DATA_STATUSES = Object.freeze(["draft", "active", "review_required", "blocked", "archived"]);

function requiredString(input = {}, field) {
  const value = input[field];
  if (typeof value !== "string" || value.trim() === "") throw new TypeError(`${field} is required`);
  return value.trim();
}

function safeId(value, fallback) {
  const raw = String(value ?? fallback ?? "").trim();
  const safe = raw.replace(/[^a-zA-Z0-9_-]/g, "_");
  if (!safe) throw new TypeError("safe id is required");
  return safe;
}

function prefixedId(prefix, value) {
  const safe = safeId(value, `${prefix}_record`);
  return safe.startsWith(`${prefix}_`) ? safe : `${prefix}_${safe}`;
}

function canonicalStatus(value) {
  if (value === "inactive") return "archived";
  return MASTER_DATA_STATUSES.includes(value) ? value : "active";
}

function commonFields(input) {
  return {
    tenant_id: requiredString(input, "tenant_id"),
    status: canonicalStatus(input.status),
    owner_user_id: requiredString(input, "owner_user_id"),
    permission_ref: input.permission_ref ?? null,
    audit_hint_ref: input.audit_hint_ref ?? null,
    synthetic_only: input.synthetic_only ?? true,
  };
}

function duplicateGuard(repository, tenantId, modelType, id) {
  if (repository.get({ tenant_id: tenantId, model_type: modelType, id })) {
    const error = new Error(`${modelType} already exists: ${id}`);
    error.safe_error_code = `MASTER_DATA_${modelType.toUpperCase()}_DUPLICATE`;
    throw error;
  }
}

function recordIdsForAccount(input = {}) {
  const accountId = safeId(input.account_id, "account");
  return Object.freeze({
    account_id: accountId,
    party_id: safeId(input.party_id, prefixedId("party", accountId)),
    entity_id: safeId(input.entity_id, prefixedId("entity", accountId)),
    organization_id: safeId(input.organization_id, accountId),
    client_group_id: safeId(input.client_group_id, prefixedId("client_group", accountId)),
  });
}

function recordIdsForContact(input = {}) {
  const contactId = safeId(input.contact_id, "contact");
  return Object.freeze({
    contact_id: contactId,
    party_id: safeId(input.party_id, prefixedId("party", contactId)),
    entity_id: safeId(input.entity_id, prefixedId("entity", contactId)),
    person_id: safeId(input.person_id, contactId),
    contact_point_id: safeId(input.contact_point_id, prefixedId("contact_point", contactId)),
  });
}

export function createCrmCanonicalWriteService({ repository } = {}) {
  if (!repository || typeof repository.create !== "function") throw new TypeError("CRM canonical write service requires repository");

  return Object.freeze({
    writeAccount(input = {}) {
      const displayName = requiredString(input, "display_name");
      const ids = recordIdsForAccount(input);
      const tenantId = requiredString(input, "tenant_id");
      duplicateGuard(repository, tenantId, "Organization", ids.organization_id);
      const base = commonFields({ ...input, tenant_id: tenantId });
      const party = repository.create({
        ...base,
        model_type: "Party",
        party_id: ids.party_id,
        party_type: "organization",
        display_name: displayName,
        canonical_entity_id: ids.entity_id,
      });
      const entity = repository.create({
        ...base,
        model_type: "Entity",
        entity_id: ids.entity_id,
        entity_kind: "organization",
        display_name: displayName,
      });
      const organization = createOrganizationService({ repository }).create({
        ...base,
        organization_id: ids.organization_id,
        party_id: party.party_id,
        entity_id: entity.entity_id,
        display_name: displayName,
        registration_number: input.registration_number ?? null,
      });
      const clientGroup = createClientGroupService({ repository }).create({
        ...base,
        client_group_id: ids.client_group_id,
        display_name: `${displayName} group`,
        member_entity_ids: [entity.entity_id],
        member_party_ids: [party.party_id],
        primary_party_id: party.party_id,
      });
      return Object.freeze({
        canonical_write_status: "created",
        account_id: ids.account_id,
        party,
        entity,
        organization,
        client_group: clientGroup,
        canonical_record_ids: Object.freeze({
          party_id: party.party_id,
          entity_id: entity.entity_id,
          organization_id: organization.organization_id,
          client_group_id: clientGroup.client_group_id,
        }),
      });
    },

    writeContact(input = {}) {
      const displayName = requiredString(input, "display_name");
      const ids = recordIdsForContact(input);
      const tenantId = requiredString(input, "tenant_id");
      duplicateGuard(repository, tenantId, "Person", ids.person_id);
      const base = commonFields({ ...input, tenant_id: tenantId });
      const party = repository.create({
        ...base,
        model_type: "Party",
        party_id: ids.party_id,
        party_type: "person",
        display_name: displayName,
        canonical_entity_id: ids.entity_id,
      });
      const entity = repository.create({
        ...base,
        model_type: "Entity",
        entity_id: ids.entity_id,
        entity_kind: "person",
        display_name: displayName,
      });
      const personResult = createPersonService({ repository }).create({
        ...base,
        person_id: ids.person_id,
        party_id: party.party_id,
        entity_id: entity.entity_id,
        display_name: displayName,
        email: input.email ?? null,
      });
      const contactPointValue = String(input.contact_point_value ?? input.primary_contact_fingerprint ?? "").trim();
      const contactPoint = contactPointValue
        ? createContactPointService({ repository }).create({
            ...base,
            contact_point_id: ids.contact_point_id,
            owner_entity_id: entity.entity_id,
            owner_party_id: party.party_id,
            contact_type: input.contact_type ?? "email",
            value: contactPointValue,
            is_primary: true,
            verified: input.verified === true,
            verification_status: input.verified === true ? "verified" : "unverified",
          })
        : null;
      const accountEntityId = typeof input.account_entity_id === "string" && input.account_entity_id.trim() !== "" ? input.account_entity_id.trim() : null;
      const relationship = accountEntityId
        ? createRelationshipService({ repository }).create({
            ...base,
            relationship_id: safeId(input.relationship_id, `relationship_${accountEntityId}_${ids.person_id}`),
            from_entity_id: entity.entity_id,
            to_entity_id: accountEntityId,
            from_party_id: party.party_id,
            to_party_id: input.account_party_id ?? null,
            relationship_type: input.relationship_type ?? "primary_contact",
            direction: "person_to_organization",
          })
        : null;
      return Object.freeze({
        canonical_write_status: "created",
        contact_id: ids.contact_id,
        party,
        entity,
        person: personResult.person,
        person_warnings: personResult.warnings,
        contact_point: contactPoint,
        relationship,
        canonical_record_ids: Object.freeze({
          party_id: party.party_id,
          entity_id: entity.entity_id,
          person_id: personResult.person.person_id,
          contact_point_id: contactPoint?.contact_point_id ?? null,
          relationship_id: relationship?.relationship_id ?? null,
        }),
      });
    },
  });
}
