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
const organizationContractPath = "docs/lazycodex/people-reflection/organization-affiliation-contract.json";
const organizationSummaryPath = "docs/lazycodex/people-reflection/organization-affiliation-contract.md";
const matterParticipationContractPath = "docs/lazycodex/people-reflection/matter-participation-contract.json";
const matterParticipationSummaryPath = "docs/lazycodex/people-reflection/matter-participation-contract.md";
const clientContactContractPath = "docs/lazycodex/people-reflection/client-contact-contract.json";
const clientContactSummaryPath = "docs/lazycodex/people-reflection/client-contact-contract.md";
const claimBoundaryPath = "docs/lazycodex/people-reflection/claim-boundary.md";
const gapLedgerPath = "docs/lazycodex/people-reflection/gap-ledger.md";

for (const path of [
  contractPath,
  summaryPath,
  organizationContractPath,
  organizationSummaryPath,
  matterParticipationContractPath,
  matterParticipationSummaryPath,
  clientContactContractPath,
  clientContactSummaryPath,
  claimBoundaryPath,
  gapLedgerPath
]) {
  assert.equal(existsSync(path), true, `${path} is required`);
}

const contract = readJson(contractPath);
const summary = read(summaryPath);
const organizationContract = readJson(organizationContractPath);
const organizationSummary = read(organizationSummaryPath);
const matterParticipationContract = readJson(matterParticipationContractPath);
const matterParticipationSummary = read(matterParticipationSummaryPath);
const clientContactContract = readJson(clientContactContractPath);
const clientContactSummary = read(clientContactSummaryPath);
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

function requireFields(row, fields, label) {
  const actual = new Set(row.required_fields);
  for (const field of fields) assert.equal(actual.has(field), true, `${label}: required field missing: ${field}`);
}

function requireArrayContains(values, required, label) {
  const actual = new Set(values);
  for (const value of required) assert.equal(actual.has(value), true, `${label}: missing ${value}`);
}

assert.equal(organizationContract.schema_version, "lawos.lcx_ppl.organization_affiliation_contract.v0.1");
assert.equal(organizationContract.tuw, "LCX-PPL-02.02");
assert.equal(organizationContract.status, "contract_ready_not_runtime_complete");
assert.equal(organizationContract.claim_boundary?.runtime_ready_candidate_complete, false);
assert.equal(organizationContract.claim_boundary?.organization_relationship_runtime_complete, false);
requireFields(organizationContract.organization, ["organization_id", "display_name", "organization_type", "tenant_scope", "audit_ref"], "Organization");
requireArrayContains(
  organizationContract.organization.organization_types,
  ["client", "client_affiliate", "opposing_firm", "counterparty_entity", "expert_firm", "court", "arbitration_institution", "regulator", "vendor", "internal_firm_unit"],
  "Organization.organization_types"
);
requireFields(organizationContract.affiliation, ["affiliation_id", "person_id", "organization_id", "role_title", "role_category", "tenant_scope", "audit_ref"], "Affiliation");
requireArrayContains(
  organizationContract.affiliation.role_categories,
  ["employee", "partner", "client_legal", "client_billing", "opposing_counsel", "counterparty_representative", "expert", "witness", "court_official", "arbitrator", "regulator"],
  "Affiliation.role_categories"
);
requireFields(organizationContract.role_history, ["role_history_id", "person_id", "organization_id", "affiliation_id", "changed_at", "changed_by", "audit_ref"], "RoleHistory");
for (const relationship of ["organization_parent_subsidiary", "organization_related_party", "organization_beneficial_owner", "organization_conflict_subject"]) {
  const row = organizationContract.relationship_types.find((item) => item.type_id === relationship);
  assert.ok(row, `Organization relationship type missing: ${relationship}`);
  assert.equal(row.review_required, true, `${relationship}: review_required must be true`);
  assert.match(organizationSummary, new RegExp(relationship), `organization summary missing ${relationship}`);
}
for (const primitive of ["Party", "Entity", "Organization", "Person", "Relationship", "ContactPoint"]) {
  assert.ok(organizationContract.master_data_alignment.existing_primitives.includes(primitive), `master data alignment missing ${primitive}`);
  assert.match(organizationSummary, new RegExp(primitive), `organization summary missing ${primitive}`);
}

assert.equal(matterParticipationContract.schema_version, "lawos.lcx_ppl.matter_participation_contract.v0.1");
assert.equal(matterParticipationContract.tuw, "LCX-PPL-02.03");
assert.equal(matterParticipationContract.status, "contract_ready_not_runtime_complete");
assert.equal(matterParticipationContract.claim_boundary?.runtime_ready_candidate_complete, false);
assert.equal(matterParticipationContract.claim_boundary?.matter_participation_runtime_complete, false);
assert.equal(matterParticipationContract.claim_boundary?.ai_final_decision_allowed, false);
requireFields(
  matterParticipationContract.matter_participant,
  ["matter_participant_id", "matter_id", "person_id", "organization_id", "matter_role_id", "representation_side", "access_scope", "tenant_scope", "audit_ref"],
  "MatterParticipant"
);
requireArrayContains(
  matterParticipationContract.representation_sides.map((side) => side.side_id),
  ["firm_internal", "client_side", "adverse_side", "neutral_expert", "tribunal_or_regulator"],
  "representation_sides"
);
for (const category of ["internal_team", "client_side", "adverse_or_transactional_side", "expert_or_witness", "tribunal_or_regulator"]) {
  assert.ok(matterParticipationContract.matter_roles.some((role) => role.category === category), `matter_roles missing category ${category}`);
}
for (const role of ["responsible_attorney", "client_decision_maker", "opposing_counsel", "expert", "witness", "court_actor", "regulator_contact"]) {
  assert.ok(matterParticipationContract.matter_roles.some((item) => item.matter_role_id === role), `matter role missing ${role}`);
  assert.match(matterParticipationSummary, new RegExp(role), `matter participation summary missing ${role}`);
}
for (const rule of ["deny-by-default", "Ethical-wall membership", "human review evidence"]) {
  assert.ok(matterParticipationContract.permission_rules.some((item) => item.includes(rule)), `matter permission rule missing ${rule}`);
}
for (const event of ["people.matter_participant.proposed", "people.matter_participant.role_changed", "people.matter_participant.access_scope_reviewed"]) {
  assert.ok(matterParticipationContract.audit_events.includes(event), `matter audit event missing ${event}`);
  assert.match(matterParticipationSummary, new RegExp(event.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")), `matter summary missing ${event}`);
}

assert.equal(clientContactContract.schema_version, "lawos.lcx_ppl.client_contact_contract.v0.1");
assert.equal(clientContactContract.tuw, "LCX-PPL-02.04");
assert.equal(clientContactContract.status, "contract_ready_not_runtime_complete");
assert.equal(clientContactContract.claim_boundary?.runtime_ready_candidate_complete, false);
assert.equal(clientContactContract.claim_boundary?.client_contact_runtime_complete, false);
assert.equal(clientContactContract.claim_boundary?.portal_access_runtime_complete, false);
requireFields(
  clientContactContract.client_contact,
  ["client_contact_id", "client_id", "person_id", "organization_id", "affiliation_id", "contact_role", "decision_role", "relationship_owner_person_id", "portal_access_state", "billing_contact_state", "tenant_scope", "audit_ref"],
  "ClientContact"
);
requireArrayContains(
  clientContactContract.client_contact.contact_roles,
  ["legal_team", "decision_maker", "billing_contact", "portal_user", "former_contact"],
  "ClientContact.contact_roles"
);
requireFields(
  clientContactContract.client_contact_ledger,
  ["ledger_id", "client_id", "person_id", "change_type", "changed_by", "changed_at", "review_state", "audit_ref"],
  "ClientContactLedger"
);
requireFields(
  clientContactContract.portal_access_boundary,
  ["portal_access_state", "client_id", "person_id", "allowed_matter_ids", "allowed_document_scope", "reviewer_person_id", "reviewed_at", "audit_ref"],
  "ClientPortalAccessBoundary"
);
for (const rule of ["never granted by contact creation alone", "explicit reviewer evidence", "allowlisted", "audit evidence"]) {
  assert.ok(clientContactContract.portal_access_boundary.rules.some((item) => item.includes(rule)), `portal access rule missing ${rule}`);
}
for (const surface of ["Client detail", "People detail", "Matter detail"]) {
  assert.ok(clientContactContract.backlink_requirements.some((item) => item.source_surface === surface), `backlink source missing ${surface}`);
  assert.match(clientContactSummary, new RegExp(surface), `client contact summary missing ${surface}`);
}
for (const surface of ["Client accounts", "Client contacts", "Contact create", "Contact patch", "Duplicate merge proposal review"]) {
  assert.ok(clientContactContract.crm_alignment.existing_surfaces.includes(surface), `CRM alignment missing ${surface}`);
}
for (const event of ["people.client_contact.created", "people.client_contact.portal_access_reviewed", "people.client_contact.deactivated"]) {
  assert.ok(clientContactContract.audit_events.includes(event), `client contact audit event missing ${event}`);
  assert.match(clientContactSummary, new RegExp(event.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")), `client contact summary missing ${event}`);
}

console.log(JSON.stringify({
  verdict: "PASS",
  program_id: contract.program_id,
  tuws: [contract.tuw, organizationContract.tuw, matterParticipationContract.tuw, clientContactContract.tuw],
  person_type_count: contract.person_types.length,
  relationship_primitive_count: contract.relationship_primitives.length,
  organization_type_count: organizationContract.organization.organization_types.length,
  matter_role_count: matterParticipationContract.matter_roles.length,
  client_contact_role_count: clientContactContract.client_contact.contact_roles.length,
  runtime_ready_candidate_complete: contract.claim_boundary.runtime_ready_candidate_complete,
  production_ready: contract.claim_boundary.production_ready,
  enterprise_trust_approved: contract.claim_boundary.enterprise_trust_approved
}, null, 2));
