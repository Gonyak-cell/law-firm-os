# LCX-PPL-02.01 Legal People Taxonomy Contract

Date: 2026-06-24  
Program: `LCX-PPL Full Reflection`  
TUW: `LCX-PPL-02.01`

## Boundary

This contract defines the first legal People taxonomy required before runtime
APIs and UI expansion. It does not make the People legal relationship workspace
runtime-ready by itself.

Current claim state:

- Runtime-ready candidate complete: `false`
- Production ready: `false`
- Go-live approved: `false`
- Enterprise trust approved: `false`
- External provider ready: `false`
- AI-only final decision allowed: `false`

## Required Person Types

| Type ID | Korean Label | Actor Category | Primary Purpose |
| --- | --- | --- | --- |
| `internal_lawyer` | 내부 변호사 | internal | Partner, associate, counsel, and other lawyer profiles connected to matters, clients, staffing, rates, and review duties. |
| `staff_paralegal` | 스태프/패러리걸 | internal | Staff and paralegal profiles connected to matter work, assignments, capacity, and restricted HR boundaries. |
| `client_contact` | 고객 담당자 | external_client | Client-side people, legal team members, billing contacts, decision makers, and portal users. |
| `counterparty` | 상대방 | external_adverse_or_transactional | Adverse or transactional people/entities that can become conflict subjects or related parties. |
| `opposing_counsel` | 상대방 대리인 | external_counsel | Outside lawyers or firms representing counterparties. |
| `expert_witness` | 전문가/증인 | external_expert | Experts, witnesses, declarants, and similar matter-specific evidence actors. |
| `court_actor` | 재판부/법원 관계자 | external_tribunal | Court, judge, clerk, and tribunal-adjacent actors. |
| `arbitrator` | 중재인 | external_tribunal | Arbitrators and arbitration panel members. |
| `regulator_contact` | 규제기관 담당자 | external_regulator | Regulator contacts, filing recipients, and agency-side communication actors. |

## Base Required Fields

Every person type inherits:

- `person_id`
- `display_name`
- `type_id`
- `status`
- `tenant_scope`
- `created_at`
- `updated_at`
- `audit_ref`

## Relationship Primitives

The taxonomy allows later TUWs to implement these relationship primitives:

- `person_to_organization_affiliation`
- `person_to_client_contact`
- `person_to_matter_participation`
- `person_to_person_relationship`
- `person_to_document_reference`
- `person_to_conflict_subject`
- `person_to_ethical_wall_membership`

## Review Rules

- AI output is an untrusted claim until reviewed.
- Conflict, ethical-wall, legal access, payroll, evaluation, discipline, and
  termination decisions require human review evidence before final state.
- Runtime implementation must add permission-aware APIs before exposing any new
  working UI for these legal People records.

## Next TUWs

- `LCX-PPL-02.02`: Organization and affiliation contract.
- `LCX-PPL-02.03`: Matter participation contract.
- `LCX-PPL-02.04`: Client contact contract and Client/Matter backlinks.

