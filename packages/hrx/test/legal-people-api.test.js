import assert from "node:assert/strict";
import test from "node:test";
import {
  createLegalPeopleApiSeed,
  createLegalPeoplePermissionContext,
  createLegalPeopleReadModel,
  LCX_PPL_API_BOUNDARY,
} from "../src/legal-people-api.js";

const tenant_id = "tenant_lcx_ppl_test";

function createHarness() {
  const seed = createLegalPeopleApiSeed(tenant_id);
  const readModel = createLegalPeopleReadModel({ seed });
  return { readModel };
}

function restrictedPermission() {
  return createLegalPeoplePermissionContext({
    actor_id: "people-ops-001",
    actor_role: "people_ops",
  });
}

function privilegedPermission() {
  return createLegalPeoplePermissionContext({
    actor_id: "legal-ops-001",
    actor_role: "legal_ops,conflicts_reviewer",
  });
}

test("searches legal People by type, organization, Client, Matter, and status filters", () => {
  const { readModel } = createHarness();
  const byType = readModel.searchPeople({ tenant_id, type_id: "opposing_counsel" }, restrictedPermission());
  assert.equal(byType.people.length, 1);
  assert.equal(byType.people[0].person_id, "person_opposing_counsel_001");

  const byOrganization = readModel.searchPeople(
    { tenant_id, organization_id: "org_internal_firm_unit_001", status: "active" },
    restrictedPermission(),
  );
  assert.ok(byOrganization.people.some((person) => person.type_id === "internal_lawyer"));
  assert.ok(byOrganization.people.some((person) => person.type_id === "staff_paralegal"));

  const byClient = readModel.searchPeople({ tenant_id, client_id: "client_lcx_001" }, restrictedPermission());
  assert.ok(byClient.people.some((person) => person.type_id === "client_contact"));
  assert.ok(byClient.people.some((person) => person.type_id === "counterparty"));

  const byMatter = readModel.searchPeople({ tenant_id, matter_id: "matter_lcx_regulatory_001" }, restrictedPermission());
  assert.deepEqual(byMatter.people.map((person) => person.person_id), ["person_regulator_contact_001"]);
});

test("returns legal People detail payload with relationships, affiliations, audit summary, and claim boundary", () => {
  const { readModel } = createHarness();
  const detail = readModel.getPersonDetail(
    { tenant_id, person_id: "person_internal_lawyer_001" },
    privilegedPermission(),
  );
  assert.equal(detail.person.type_id, "internal_lawyer");
  assert.equal(detail.affiliations.length, 1);
  assert.ok(detail.relationships.some((relationship) => relationship.target_type === "organization"));
  assert.equal(detail.ethical_wall_references.length, 1);
  assert.ok(detail.audit_summary.event_count >= 1);
  assert.equal(detail.claim_boundary.people_detail_api_complete, true);
  assert.equal(detail.claim_boundary.production_ready, false);
});

test("redacts restricted relationship and sensitive person details for non-privileged actors", () => {
  const { readModel } = createHarness();
  const detail = readModel.getPersonDetail(
    { tenant_id, person_id: "person_client_contact_001" },
    restrictedPermission(),
  );
  const clientRelationship = detail.relationships.find(
    (relationship) => relationship.relationship_type === "person_to_client_contact",
  );
  assert.equal(clientRelationship.target_id, null);
  assert.equal(clientRelationship.access_state, "restricted");
  assert.deepEqual(clientRelationship.source_refs, []);
  assert.equal(Object.hasOwn(detail.person, "sensitive_refs"), false);
  assert.ok(detail.person.permission_summary.redacted_sensitive_fields.includes("portal_access_state"));
  assert.equal(JSON.stringify(detail).includes("PortalAccess:client_lcx_001"), false);
});

test("privileged legal People actors can see restricted target refs without raw payload fields", () => {
  const { readModel } = createHarness();
  const detail = readModel.getPersonDetail(
    { tenant_id, person_id: "person_opposing_counsel_001" },
    privilegedPermission(),
  );
  const matterRelationship = detail.relationships.find(
    (relationship) => relationship.relationship_type === "person_to_matter_participation",
  );
  assert.equal(matterRelationship.target_id, "matter_lcx_001");
  assert.equal(matterRelationship.access_state, "visible");
  const serialized = JSON.stringify(detail);
  assert.equal(serialized.includes("raw_email"), false);
  assert.equal(serialized.includes("\"provider_payload\":"), false);
  assert.equal(serialized.includes("\"provider_payload_included\":true"), false);
});

test("relationship API pivots by person, Client, Matter, and Organization", () => {
  const { readModel } = createHarness();
  const byPerson = readModel.listRelationships(
    { tenant_id, person_id: "person_internal_lawyer_001" },
    privilegedPermission(),
  );
  assert.equal(byPerson.relationships.length, 1);
  assert.equal(byPerson.relationships[0].target_type, "organization");

  const byClient = readModel.listRelationships(
    { tenant_id, target_type: "client", target_id: "client_lcx_001" },
    privilegedPermission(),
  );
  assert.equal(byClient.relationships.length, 1);
  assert.equal(byClient.relationships[0].subject_person_id, "person_client_contact_001");

  const byMatter = readModel.listRelationships(
    { tenant_id, target_type: "matter", target_id: "matter_lcx_001" },
    privilegedPermission(),
  );
  assert.ok(byMatter.relationships.some((relationship) => relationship.subject_person_id === "person_opposing_counsel_001"));
  assert.ok(byMatter.relationships.some((relationship) => relationship.subject_person_id === "person_court_actor_001"));

  const byOrganization = readModel.listRelationships(
    { tenant_id, target_type: "organization", target_id: "org_internal_firm_unit_001" },
    privilegedPermission(),
  );
  assert.deepEqual(byOrganization.relationships.map((relationship) => relationship.subject_person_id), [
    "person_internal_lawyer_001",
  ]);
});

test("LCX-PPL-04 API boundary remains local and does not claim production or enterprise trust", () => {
  assert.equal(LCX_PPL_API_BOUNDARY.people_search_api_complete, true);
  assert.equal(LCX_PPL_API_BOUNDARY.relationship_api_complete, true);
  assert.equal(LCX_PPL_API_BOUNDARY.permission_aware_api_response_complete, true);
  assert.equal(LCX_PPL_API_BOUNDARY.runtime_ready_candidate_complete, false);
  assert.equal(LCX_PPL_API_BOUNDARY.production_ready, false);
  assert.equal(LCX_PPL_API_BOUNDARY.go_live_approved, false);
  assert.equal(LCX_PPL_API_BOUNDARY.enterprise_trust_approved, false);
});
