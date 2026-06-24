import assert from "node:assert/strict";
import test from "node:test";
import {
  createConflictReference,
  createEthicalWallReference,
  createLegalPeopleRelationship,
  createLegalPeopleRelationshipRepository,
  createLegalPeopleRelationshipSeed,
  LCX_PPL_RELATIONSHIP_LEDGER_BOUNDARY,
} from "../src/legal-people-relationship-ledger.js";

test("LCX-PPL relationship ledger stores and queries legal People relationships by tenant and pivots", () => {
  const seed = createLegalPeopleRelationshipSeed("tenant-a");
  const repository = createLegalPeopleRelationshipRepository(seed);

  assert.equal(repository.listRelationships({ tenant_id: "tenant-a" }).length, 6);
  assert.equal(repository.listRelationships({ tenant_id: "tenant-b" }).length, 0);
  assert.equal(
    repository.listRelationships({
      tenant_id: "tenant-a",
      subject_person_id: "person_client_contact_001",
      target_type: "client",
      relationship_type: "person_to_client_contact",
    }).length,
    1,
  );
  assert.equal(repository.listRelationships({ tenant_id: "tenant-a", target_id: "matter_lcx_001" }).length, 2);
});

test("LCX-PPL relationship ledger rejects raw client/contact/provider leakage", () => {
  assert.throws(
    () =>
      createLegalPeopleRelationship({
        tenant_id: "tenant-a",
        relationship_id: "rel-raw",
        subject_person_id: "person-001",
        target_type: "client",
        target_id: "client-001",
        relationship_type: "person_to_client_contact",
        relationship_direction: "person_to_client",
        status: "active",
        effective_from: "2026-06-24",
        audit_ref: "audit-raw",
        client_name: "Sensitive Client",
      }),
    /must not include client_name/,
  );
  assert.throws(
    () =>
      createLegalPeopleRelationship({
        tenant_id: "tenant-a",
        relationship_id: "rel-raw-meta",
        subject_person_id: "person-001",
        target_type: "client",
        target_id: "client-001",
        relationship_type: "person_to_client_contact",
        relationship_direction: "person_to_client",
        status: "active",
        effective_from: "2026-06-24",
        audit_ref: "audit-raw-meta",
        metadata: { raw_email: "person@example.com" },
      }),
    /must not include raw_email/,
  );
});

test("LCX-PPL conflict and ethical wall references require review and never final AI decisions", () => {
  const conflict = createConflictReference({
    tenant_id: "tenant-a",
    conflict_ref_id: "conflict-001",
    subject_person_id: "person-counterparty",
    related_ref: "client:client-001",
    conflict_basis: "adverse_related_party",
    status: "review_required",
    audit_ref: "audit-conflict",
  });
  const wall = createEthicalWallReference({
    tenant_id: "tenant-a",
    wall_ref_id: "wall-001",
    subject_person_id: "person-lawyer",
    matter_id: "matter-001",
    wall_status: "review_required",
    access_effect: "review_required",
    audit_ref: "audit-wall",
  });

  assert.equal(conflict.reviewer_required, true);
  assert.equal(conflict.final_decision, false);
  assert.equal(conflict.ai_final_decision_allowed, false);
  assert.equal(wall.reviewer_required, true);
  assert.equal(wall.final_decision, false);
  assert.equal(wall.ai_final_decision_allowed, false);
});

test("LCX-PPL relationship repository appends audit events for relationship, conflict, and wall writes", () => {
  const repository = createLegalPeopleRelationshipRepository();
  repository.upsertRelationship({
    tenant_id: "tenant-a",
    relationship_id: "rel-001",
    subject_person_id: "person-client",
    target_type: "client",
    target_id: "client-001",
    relationship_type: "person_to_client_contact",
    relationship_direction: "person_to_client",
    status: "review_required",
    effective_from: "2026-06-24",
    source_refs: ["LCX-PPL-02.04"],
    audit_ref: "audit-rel-001",
  });
  repository.addConflictReference({
    tenant_id: "tenant-a",
    conflict_ref_id: "conflict-001",
    subject_person_id: "person-client",
    related_ref: "matter:matter-001",
    conflict_basis: "client_contact_related_to_adverse_party",
    status: "review_required",
    audit_ref: "audit-conflict-001",
  });
  repository.addEthicalWallReference({
    tenant_id: "tenant-a",
    wall_ref_id: "wall-001",
    subject_person_id: "person-client",
    matter_id: "matter-001",
    wall_status: "review_required",
    access_effect: "restrict",
    audit_ref: "audit-wall-001",
  });

  const events = repository.listAuditEvents({ tenant_id: "tenant-a" });
  assert.deepEqual(
    events.map((event) => event.action),
    [
      "people.relationship.created",
      "people.conflict_reference.created",
      "people.ethical_wall_reference.created",
    ],
  );
  for (const event of events) {
    assert.equal(event.writes_audit_event, true);
    assert.equal(event.production_ready_claim, false);
    assert.equal(event.metadata.raw_contact_values_included, false);
    assert.equal(event.metadata.provider_payload_included, false);
  }
});

test("LCX-PPL relationship ledger boundary preserves launch claim separation", () => {
  assert.equal(LCX_PPL_RELATIONSHIP_LEDGER_BOUNDARY.runtime_ready_candidate_complete, false);
  assert.equal(LCX_PPL_RELATIONSHIP_LEDGER_BOUNDARY.production_ready, false);
  assert.equal(LCX_PPL_RELATIONSHIP_LEDGER_BOUNDARY.go_live_approved, false);
  assert.equal(LCX_PPL_RELATIONSHIP_LEDGER_BOUNDARY.enterprise_trust_approved, false);
  assert.equal(LCX_PPL_RELATIONSHIP_LEDGER_BOUNDARY.ai_final_decision_allowed, false);
});
