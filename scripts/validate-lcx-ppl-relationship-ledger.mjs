#!/usr/bin/env node
import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import {
  createConflictReference,
  createEthicalWallReference,
  createLegalPeopleRelationship,
  createLegalPeopleRelationshipRepository,
  createLegalPeopleRelationshipSeed,
  LCX_PPL_RELATIONSHIP_LEDGER_BOUNDARY,
} from "../packages/hrx/src/legal-people-relationship-ledger.js";

function read(path) {
  return readFileSync(path, "utf8");
}

function readJson(path) {
  return JSON.parse(read(path));
}

const contractPath = "docs/lazycodex/people-reflection/relationship-ledger-contract.json";
const summaryPath = "docs/lazycodex/people-reflection/relationship-ledger-contract.md";
const sourcePath = "packages/hrx/src/legal-people-relationship-ledger.js";
const testPath = "packages/hrx/test/legal-people-relationship-ledger.test.js";
const legalPeopleContractPath = "docs/lazycodex/people-reflection/legal-people-taxonomy-contract.json";
const organizationContractPath = "docs/lazycodex/people-reflection/organization-affiliation-contract.json";
const matterParticipationContractPath = "docs/lazycodex/people-reflection/matter-participation-contract.json";
const clientContactContractPath = "docs/lazycodex/people-reflection/client-contact-contract.json";

for (const path of [
  contractPath,
  summaryPath,
  sourcePath,
  testPath,
  legalPeopleContractPath,
  organizationContractPath,
  matterParticipationContractPath,
  clientContactContractPath,
]) {
  assert.equal(existsSync(path), true, `${path} is required`);
}

const contract = readJson(contractPath);
const summary = read(summaryPath);
const source = read(sourcePath);
const testSource = read(testPath);
const peopleContract = readJson(legalPeopleContractPath);

assert.equal(contract.schema_version, "lawos.lcx_ppl.relationship_ledger_contract.v0.1");
assert.equal(contract.program_id, "LCX-PPL Full Reflection");
assert.deepEqual(contract.scope, ["LCX-PPL-03.01", "LCX-PPL-03.02", "LCX-PPL-03.03", "LCX-PPL-03.04"]);
assert.equal(contract.status, "local_runtime_repository_foundation_ready");
assert.equal(contract.claim_boundary.relationship_repository_local_ready, true);
assert.equal(contract.claim_boundary.api_routes_complete, false);
assert.equal(contract.claim_boundary.ui_reflection_complete, false);
assert.equal(contract.claim_boundary.browser_qa_complete, false);
assert.equal(contract.claim_boundary.runtime_ready_candidate_complete, false);
assert.equal(contract.claim_boundary.production_ready, false);
assert.equal(contract.claim_boundary.go_live_approved, false);
assert.equal(contract.claim_boundary.enterprise_trust_approved, false);
assert.equal(contract.claim_boundary.ai_final_decision_allowed, false);

for (const exportName of [
  "createLegalPeopleRelationship",
  "createConflictReference",
  "createEthicalWallReference",
  "createLegalPeopleAuditEvent",
  "createLegalPeopleRelationshipSeed",
  "createLegalPeopleRelationshipRepository",
  "LCX_PPL_RELATIONSHIP_LEDGER_BOUNDARY",
]) {
  assert.match(source, new RegExp(`export (function|const) ${exportName}`), `source missing export ${exportName}`);
}

for (const relationshipType of peopleContract.relationship_primitives) {
  assert.ok(contract.relationship_types.includes(relationshipType), `contract missing relationship type ${relationshipType}`);
  assert.match(summary, new RegExp(relationshipType), `summary missing relationship type ${relationshipType}`);
}

for (const guard of contract.privacy_guards) {
  assert.match(source, new RegExp(`"${guard}"`), `source missing privacy guard ${guard}`);
  assert.match(summary, new RegExp(guard), `summary missing privacy guard ${guard}`);
}

for (const auditAction of contract.audit_actions) {
  assert.match(source, new RegExp(auditAction.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")), `source missing audit action ${auditAction}`);
  assert.match(summary, new RegExp(auditAction.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")), `summary missing audit action ${auditAction}`);
}

for (const marker of [
  "stores and queries legal People relationships",
  "rejects raw client/contact/provider leakage",
  "require review and never final AI decisions",
  "appends audit events",
  "preserves launch claim separation",
]) {
  assert.match(testSource, new RegExp(marker), `test missing marker ${marker}`);
}

const seed = createLegalPeopleRelationshipSeed("tenant-validator");
assert.equal(seed.relationships.length, 6, "seed must include six relationship rows");
assert.equal(seed.conflict_references.length, 1, "seed must include one conflict reference");
assert.equal(seed.ethical_wall_references.length, 1, "seed must include one ethical wall reference");
const repository = createLegalPeopleRelationshipRepository(seed);
assert.equal(repository.listRelationships({ tenant_id: "tenant-validator" }).length, 6);
assert.equal(repository.listRelationships({ tenant_id: "tenant-other" }).length, 0);
assert.equal(repository.listConflictReferences({ tenant_id: "tenant-validator" })[0].reviewer_required, true);
assert.equal(repository.listEthicalWallReferences({ tenant_id: "tenant-validator" })[0].final_decision, false);
assert.equal(repository.listAuditEvents({ tenant_id: "tenant-validator" }).length, 8);

assert.throws(
  () =>
    createLegalPeopleRelationship({
      tenant_id: "tenant-validator",
      relationship_id: "rel_forbidden",
      subject_person_id: "person",
      target_type: "client",
      target_id: "client",
      relationship_type: "person_to_client_contact",
      relationship_direction: "person_to_client",
      status: "active",
      effective_from: "2026-06-24",
      audit_ref: "audit_forbidden",
      raw_phone: "+82-2-0000-0000",
    }),
  /must not include raw_phone/,
);

assert.equal(
  createConflictReference({
    tenant_id: "tenant-validator",
    conflict_ref_id: "conflict_validator",
    subject_person_id: "person",
    related_ref: "client:client",
    conflict_basis: "related_party",
    status: "review_required",
    audit_ref: "audit_conflict_validator",
  }).ai_final_decision_allowed,
  false,
);
assert.equal(
  createEthicalWallReference({
    tenant_id: "tenant-validator",
    wall_ref_id: "wall_validator",
    subject_person_id: "person",
    matter_id: "matter",
    wall_status: "review_required",
    access_effect: "review_required",
    audit_ref: "audit_wall_validator",
  }).reviewer_required,
  true,
);

assert.equal(LCX_PPL_RELATIONSHIP_LEDGER_BOUNDARY.runtime_ready_candidate_complete, false);
assert.equal(LCX_PPL_RELATIONSHIP_LEDGER_BOUNDARY.production_ready, false);
assert.equal(LCX_PPL_RELATIONSHIP_LEDGER_BOUNDARY.go_live_approved, false);
assert.equal(LCX_PPL_RELATIONSHIP_LEDGER_BOUNDARY.enterprise_trust_approved, false);
assert.equal(LCX_PPL_RELATIONSHIP_LEDGER_BOUNDARY.ai_final_decision_allowed, false);

console.log(JSON.stringify({
  verdict: "PASS",
  program_id: contract.program_id,
  scope: contract.scope,
  relationship_count: seed.relationships.length,
  conflict_reference_count: seed.conflict_references.length,
  ethical_wall_reference_count: seed.ethical_wall_references.length,
  audit_event_count: repository.listAuditEvents({ tenant_id: "tenant-validator" }).length,
  api_routes_complete: contract.claim_boundary.api_routes_complete,
  ui_reflection_complete: contract.claim_boundary.ui_reflection_complete,
  runtime_ready_candidate_complete: contract.claim_boundary.runtime_ready_candidate_complete,
  production_ready: contract.claim_boundary.production_ready,
  enterprise_trust_approved: contract.claim_boundary.enterprise_trust_approved
}, null, 2));

