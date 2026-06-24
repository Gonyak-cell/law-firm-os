# LCX-PPL-03 Relationship Ledger Contract

Date: 2026-06-24  
Program: `LCX-PPL Full Reflection`  
Scope: `LCX-PPL-03.01` through `LCX-PPL-03.04`

## Boundary

This contract covers the local runtime repository foundation for legal People
relationships. It does not complete API routes, UI reflection, browser QA, full
runtime-ready candidate status, production readiness, go-live approval, or
enterprise trust.

Current claim state:

- Relationship repository local ready: `true`
- API routes complete: `false`
- UI reflection complete: `false`
- Browser QA complete: `false`
- Runtime-ready candidate complete: `false`
- Production ready: `false`
- Go-live approved: `false`
- Enterprise trust approved: `false`
- AI-only final decision allowed: `false`

## Runtime Objects

- `LegalPeopleRelationship`
- `ConflictReference`
- `EthicalWallReference`
- `LegalPeopleAuditEvent`
- `LegalPeopleRelationshipRepository`

## Relationship Types

- `person_to_organization_affiliation`
- `person_to_client_contact`
- `person_to_matter_participation`
- `person_to_person_relationship`
- `person_to_document_reference`
- `person_to_conflict_subject`
- `person_to_ethical_wall_membership`

## Seed Fixture Coverage

- `internal_lawyer_to_internal_unit`
- `client_contact_to_client`
- `opposing_counsel_to_matter`
- `expert_witness_to_document`
- `court_actor_to_matter`
- `regulator_contact_to_matter`
- `counterparty_conflict_reference`
- `internal_lawyer_ethical_wall_reference`

## Privacy Guards

The ledger rejects these raw fields at relationship, conflict, wall, audit, and
metadata boundaries:

- `client_name`
- `raw_contact_value`
- `raw_email`
- `raw_phone`
- `raw_address`
- `raw_document_text`
- `storage_path`
- `provider_payload`
- `credential`
- `token`

## Audit Actions

- `people.relationship.created`
- `people.relationship.updated`
- `people.relationship.blocked`
- `people.conflict_reference.created`
- `people.ethical_wall_reference.created`

## Next TUWs

- `LCX-PPL-04.01`: People Search API
- `LCX-PPL-04.02`: People Detail API
- `LCX-PPL-04.03`: Relationship API
- `LCX-PPL-04.04`: Permission-aware response shaping

