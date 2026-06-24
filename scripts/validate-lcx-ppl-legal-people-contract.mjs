#!/usr/bin/env node
import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";

function read(path) {
  return readFileSync(path, "utf8");
}

function readJson(path) {
  return JSON.parse(read(path));
}

const contractPath = "docs/lazycodex/people-reflection/legal-people-taxonomy-contract.json";
const summaryPath = "docs/lazycodex/people-reflection/legal-people-taxonomy-contract.md";
const claimBoundaryPath = "docs/lazycodex/people-reflection/claim-boundary.md";
const gapLedgerPath = "docs/lazycodex/people-reflection/gap-ledger.md";

for (const path of [contractPath, summaryPath, claimBoundaryPath, gapLedgerPath]) {
  assert.equal(existsSync(path), true, `${path} is required`);
}

const contract = readJson(contractPath);
const summary = read(summaryPath);
const claimBoundary = read(claimBoundaryPath);
const gapLedger = read(gapLedgerPath);

assert.equal(contract.schema_version, "lawos.lcx_ppl.legal_people_taxonomy.v0.1");
assert.equal(contract.program_id, "LCX-PPL Full Reflection");
assert.equal(contract.tuw, "LCX-PPL-02.01");
assert.equal(contract.status, "contract_ready_not_runtime_complete");
assert.equal(contract.claim_boundary?.runtime_ready_candidate_complete, false);
assert.equal(contract.claim_boundary?.production_ready, false);
assert.equal(contract.claim_boundary?.go_live_approved, false);
assert.equal(contract.claim_boundary?.enterprise_trust_approved, false);
assert.equal(contract.claim_boundary?.external_provider_ready, false);
assert.equal(contract.claim_boundary?.ai_final_decision_allowed, false);

for (const expectedBoundary of [
  "People is a first-class Law Firm OS axis, not only HRX.",
  "AI output is an untrusted claim until reviewed.",
  "production",
  "go_live",
  "enterprise_trust"
]) {
  assert.match(claimBoundary, new RegExp(expectedBoundary.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")), `claim boundary missing ${expectedBoundary}`);
}

const requiredTypeIds = [
  "internal_lawyer",
  "staff_paralegal",
  "client_contact",
  "counterparty",
  "opposing_counsel",
  "expert_witness",
  "court_actor",
  "arbitrator",
  "regulator_contact"
];

const baseRequiredFields = new Set(contract.base_required_fields);
for (const field of ["person_id", "display_name", "type_id", "status", "tenant_scope", "created_at", "updated_at", "audit_ref"]) {
  assert.equal(baseRequiredFields.has(field), true, `base required field missing: ${field}`);
}

assert.equal(Array.isArray(contract.person_types), true, "person_types must be an array");
assert.equal(contract.person_types.length >= requiredTypeIds.length, true, "person_types must cover all required legal People types");

const byType = new Map(contract.person_types.map((type) => [type.type_id, type]));
for (const typeId of requiredTypeIds) {
  const type = byType.get(typeId);
  assert.ok(type, `required person type missing: ${typeId}`);
  assert.equal(typeof type.korean_label, "string", `${typeId}: korean_label required`);
  assert.equal(type.korean_label.length > 0, true, `${typeId}: korean_label cannot be empty`);
  assert.equal(typeof type.actor_category, "string", `${typeId}: actor_category required`);
  assert.equal(Array.isArray(type.required_fields) && type.required_fields.length > 0, true, `${typeId}: required_fields missing`);
  assert.equal(Array.isArray(type.sensitive_fields) && type.sensitive_fields.length > 0, true, `${typeId}: sensitive_fields missing`);
  assert.equal(Array.isArray(type.allowed_relationships) && type.allowed_relationships.length > 0, true, `${typeId}: allowed_relationships missing`);
  assert.equal(Array.isArray(type.blocked_without_review) && type.blocked_without_review.length > 0, true, `${typeId}: blocked_without_review missing`);
  assert.match(summary, new RegExp(typeId.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")), `${typeId}: summary row missing`);
  assert.match(summary, new RegExp(type.korean_label.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")), `${typeId}: Korean label missing from summary`);
}

const relationshipPrimitives = new Set(contract.relationship_primitives);
for (const primitive of [
  "person_to_organization_affiliation",
  "person_to_client_contact",
  "person_to_matter_participation",
  "person_to_person_relationship",
  "person_to_document_reference",
  "person_to_conflict_subject",
  "person_to_ethical_wall_membership"
]) {
  assert.equal(relationshipPrimitives.has(primitive), true, `relationship primitive missing: ${primitive}`);
  assert.match(summary, new RegExp(primitive.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")), `summary missing relationship primitive: ${primitive}`);
}

for (const gapId of ["PPL-GAP-007", "PPL-GAP-008", "PPL-GAP-009", "PPL-GAP-010"]) {
  assert.match(gapLedger, new RegExp(gapId), `gap ledger must carry ${gapId}`);
}

assert.match(summary, /Runtime-ready candidate complete: `false`/);
assert.match(summary, /Production ready: `false`/);
assert.match(summary, /AI-only final decision allowed: `false`/);

console.log(JSON.stringify({
  verdict: "PASS",
  program_id: contract.program_id,
  tuw: contract.tuw,
  person_type_count: contract.person_types.length,
  relationship_primitive_count: contract.relationship_primitives.length,
  runtime_ready_candidate_complete: contract.claim_boundary.runtime_ready_candidate_complete,
  production_ready: contract.claim_boundary.production_ready,
  enterprise_trust_approved: contract.claim_boundary.enterprise_trust_approved
}, null, 2));

