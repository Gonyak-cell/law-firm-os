import assert from "node:assert/strict";
import test from "node:test";
import {
  createBillingProfileService,
  createClientGroupService,
  createContactPointService,
  createMasterDataDuplicateService,
  createMasterDataRepository,
  createOrganizationService,
  createPartyAliasService,
  createPartyIdentifierService,
  createPersonService,
  createRelationshipService,
} from "../src/index.js";

const TENANT = "tenant-a";
const OWNER = "owner-a";

function createSeededRepository() {
  const repository = createMasterDataRepository();
  repository.create({
    model_type: "Party",
    tenant_id: TENANT,
    party_id: "party-org-001",
    party_type: "organization",
    display_name: "AMIC Corp",
    status: "active",
    owner_user_id: OWNER,
  });
  repository.create({
    model_type: "Party",
    tenant_id: TENANT,
    party_id: "party-person-001",
    party_type: "person",
    display_name: "Lee Contact",
    status: "active",
    owner_user_id: OWNER,
  });
  repository.create({
    model_type: "Entity",
    tenant_id: TENANT,
    entity_id: "entity-org-001",
    entity_kind: "organization",
    display_name: "AMIC Corp",
    status: "active",
    owner_user_id: OWNER,
  });
  repository.create({
    model_type: "Entity",
    tenant_id: TENANT,
    entity_id: "entity-person-001",
    entity_kind: "person",
    display_name: "Lee Contact",
    status: "active",
    owner_user_id: OWNER,
  });
  repository.create({
    model_type: "Person",
    tenant_id: TENANT,
    person_id: "person-001",
    entity_id: "entity-person-001",
    party_id: "party-person-001",
    display_name: "Lee Contact",
    email: "lee@example.com",
    status: "active",
    owner_user_id: OWNER,
  });
  repository.create({
    model_type: "Organization",
    tenant_id: TENANT,
    organization_id: "org-001",
    entity_id: "entity-org-001",
    party_id: "party-org-001",
    display_name: "AMIC Corp",
    registration_number: "BN-001",
    status: "active",
    owner_user_id: OWNER,
  });
  return repository;
}

test("Person service returns duplicate email warnings without blocking create", () => {
  const service = createPersonService({ repository: createSeededRepository() });
  const result = service.create({
    tenant_id: TENANT,
    person_id: "person-002",
    entity_id: "entity-person-001",
    party_id: "party-person-001",
    display_name: "Lee Secondary",
    email: "LEE@example.com",
    status: "active",
    owner_user_id: OWNER,
  });
  assert.equal(result.person.person_id, "person-002");
  assert.equal(result.warnings[0].code, "MASTER_DATA_DUPLICATE_EMAIL_REVIEW");
});

test("Organization service blocks duplicate business registration per tenant", () => {
  const service = createOrganizationService({ repository: createSeededRepository() });
  assert.throws(
    () =>
      service.create({
        tenant_id: TENANT,
        organization_id: "org-002",
        entity_id: "entity-org-001",
        party_id: "party-org-001",
        display_name: "AMIC Duplicate",
        registration_number: "bn-001",
        status: "active",
        owner_user_id: OWNER,
      }),
    /registration_number must be unique/,
  );
});

test("Party alias service searches Korean English and former names", () => {
  const repository = createSeededRepository();
  const service = createPartyAliasService({ repository });
  service.create({
    tenant_id: TENANT,
    party_alias_id: "alias-ko-001",
    party_id: "party-org-001",
    alias_value: "아믹",
    alias_type: "localized_name",
    locale: "ko-KR",
    status: "active",
    owner_user_id: OWNER,
  });
  service.create({
    tenant_id: TENANT,
    party_alias_id: "alias-en-001",
    party_id: "party-org-001",
    alias_value: "AMIC Corporation",
    alias_type: "legal_name",
    locale: "en-US",
    status: "active",
    owner_user_id: OWNER,
  });
  service.create({
    tenant_id: TENANT,
    party_alias_id: "alias-former-001",
    party_id: "party-org-001",
    alias_value: "Old AMIC",
    alias_type: "former_name",
    status: "active",
    owner_user_id: OWNER,
  });
  assert.equal(service.search({ tenant_id: TENANT, query: "아믹" }).length, 1);
  assert.equal(service.search({ tenant_id: TENANT, query: "corporation", locale: "en-US" }).length, 1);
  assert.equal(service.search({ tenant_id: TENANT, query: "old", alias_type: "former_name" }).length, 1);
});

test("Party identifier service enforces unique identifier per tenant", () => {
  const service = createPartyIdentifierService({ repository: createSeededRepository() });
  service.create({
    tenant_id: TENANT,
    party_identifier_id: "id-001",
    party_id: "party-org-001",
    identifier_type: "business_number",
    identifier_value: "BN-001",
    status: "active",
    owner_user_id: OWNER,
  });
  assert.throws(
    () =>
      service.create({
        tenant_id: TENANT,
        party_identifier_id: "id-002",
        party_id: "party-org-001",
        identifier_type: "business_number",
        identifier_value: "bn-001",
        status: "active",
        owner_user_id: OWNER,
      }),
    /identifier_type\/value must be unique/,
  );
});

test("ClientGroup service validates primary party and membership refs", () => {
  const service = createClientGroupService({ repository: createSeededRepository() });
  const group = service.create({
    tenant_id: TENANT,
    client_group_id: "group-001",
    display_name: "AMIC Group",
    member_entity_ids: ["entity-org-001", "entity-person-001"],
    member_party_ids: ["party-org-001", "party-person-001"],
    primary_party_id: "party-org-001",
    status: "active",
    owner_user_id: OWNER,
  });
  assert.equal(group.primary_party_id, "party-org-001");
  assert.throws(
    () =>
      service.create({
        tenant_id: TENANT,
        client_group_id: "group-002",
        display_name: "Bad Group",
        member_entity_ids: ["entity-missing"],
        status: "active",
        owner_user_id: OWNER,
      }),
    /member entity not found/,
  );
});

test("Relationship service validates direction and trims ACL-hidden endpoints", () => {
  const service = createRelationshipService({ repository: createSeededRepository() });
  const relationship = service.create({
    tenant_id: TENANT,
    relationship_id: "rel-001",
    from_entity_id: "entity-person-001",
    to_entity_id: "entity-org-001",
    relationship_type: "primary_contact",
    direction: "person_to_organization",
    status: "active",
    owner_user_id: OWNER,
  });
  assert.equal(relationship.direction, "person_to_organization");
  assert.equal(service.listForEntity({ tenant_id: TENANT, entity_id: "entity-person-001" }).length, 1);
  assert.equal(
    service.listForEntity({
      tenant_id: TENANT,
      entity_id: "entity-person-001",
      allowedEntityIds: ["entity-person-001"],
    }).length,
    0,
  );
  assert.throws(
    () =>
      service.create({
        tenant_id: TENANT,
        relationship_id: "rel-002",
        from_entity_id: "entity-person-001",
        to_entity_id: "entity-person-001",
        relationship_type: "self",
        direction: "person_to_person",
        status: "active",
        owner_user_id: OWNER,
      }),
    /same entity/,
  );
});

test("ContactPoint service validates primary and verified state", () => {
  const service = createContactPointService({ repository: createSeededRepository() });
  service.create({
    tenant_id: TENANT,
    contact_point_id: "contact-001",
    owner_entity_id: "entity-person-001",
    contact_type: "email",
    value: "lee@example.com",
    is_primary: true,
    verified: true,
    status: "active",
    owner_user_id: OWNER,
  });
  assert.throws(
    () =>
      service.create({
        tenant_id: TENANT,
        contact_point_id: "contact-002",
        owner_entity_id: "entity-person-001",
        contact_type: "email",
        value: "other@example.com",
        is_primary: true,
        status: "active",
        owner_user_id: OWNER,
      }),
    /Only one primary/,
  );
  assert.throws(
    () =>
      service.create({
        tenant_id: TENANT,
        contact_point_id: "contact-003",
        owner_entity_id: "entity-person-001",
        contact_type: "email",
        value: "bad@example.com",
        verified: true,
        verification_status: "unverified",
        status: "active",
        owner_user_id: OWNER,
      }),
    /verification_status=verified/,
  );
});

test("BillingProfile service validates legal and billing client refs", () => {
  const repository = createSeededRepository();
  const groupService = createClientGroupService({ repository });
  groupService.create({
    tenant_id: TENANT,
    client_group_id: "group-001",
    display_name: "AMIC Group",
    member_entity_ids: ["entity-org-001"],
    member_party_ids: ["party-org-001"],
    primary_party_id: "party-org-001",
    status: "active",
    owner_user_id: OWNER,
  });
  const service = createBillingProfileService({ repository });
  const profile = service.create({
    tenant_id: TENANT,
    billing_profile_id: "billing-001",
    billing_entity_id: "entity-org-001",
    display_name: "AMIC Billing",
    client_group_id: "group-001",
    legal_client_party_id: "party-org-001",
    billing_client_party_id: "party-org-001",
    status: "active",
    owner_user_id: OWNER,
  });
  assert.equal(profile.legal_client_party_id, "party-org-001");
  assert.throws(
    () =>
      service.create({
        tenant_id: TENANT,
        billing_profile_id: "billing-002",
        billing_entity_id: "entity-org-001",
        display_name: "Bad Billing",
        client_group_id: "group-001",
        legal_client_party_id: "party-org-001",
        status: "active",
        owner_user_id: OWNER,
      }),
    /legal_client_party_id and billing_client_party_id/,
  );
});

test("Duplicate service returns similar name and identifier candidates", () => {
  const repository = createSeededRepository();
  createPartyIdentifierService({ repository }).create({
    tenant_id: TENANT,
    party_identifier_id: "id-001",
    party_id: "party-org-001",
    identifier_type: "business_number",
    identifier_value: "BN-001",
    status: "active",
    owner_user_id: OWNER,
  });
  const service = createMasterDataDuplicateService({ repository });
  const candidates = service.findCandidates({
    tenant_id: TENANT,
    display_name: "AMIC",
    identifier_type: "business_number",
    identifier_value: "bn-001",
  });
  assert.ok(candidates.name_candidates.some((candidate) => candidate.display_name === "AMIC Corp"));
  assert.equal(candidates.identifier_candidates[0].party_identifier_id, "id-001");
});
