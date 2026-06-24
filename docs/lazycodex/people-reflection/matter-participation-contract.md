# LCX-PPL-02.03 Matter Participation Contract

Date: 2026-06-24  
Program: `LCX-PPL Full Reflection`  
TUW: `LCX-PPL-02.03`

## Boundary

This contract defines how People participate in Matters. It is contract-ready
only; it does not complete runtime APIs, UI, or production readiness.

Current claim state:

- Runtime-ready candidate complete: `false`
- Production ready: `false`
- Go-live approved: `false`
- Enterprise trust approved: `false`
- Matter participation runtime complete: `false`
- AI-only final decision allowed: `false`

## MatterParticipant Required Fields

- `matter_participant_id`
- `matter_id`
- `person_id`
- `organization_id`
- `matter_role_id`
- `representation_side`
- `participation_status`
- `access_scope`
- `effective_from`
- `effective_to`
- `tenant_scope`
- `audit_ref`

## Representation Sides

| Side ID | Korean Label | Meaning |
| --- | --- | --- |
| `firm_internal` | 내부 수행팀 | Internal lawyers, paralegals, and staff. |
| `client_side` | 고객 측 | Client contacts and client-authorized participants. |
| `adverse_side` | 상대방 측 | Adverse parties, counterparties, and their counsel. |
| `neutral_expert` | 전문가/증인 | Experts, witnesses, and neutral evidence actors. |
| `tribunal_or_regulator` | 재판부/규제기관 | Courts, arbitrators, regulators, and filing recipients. |

## Role Families

- Internal team: `responsible_attorney`, `billing_partner`, `associate`,
  `paralegal`
- Client side: `client_decision_maker`, `client_billing_contact`
- Adverse side: `counterparty_representative`, `opposing_counsel`
- Expert/witness: `expert`, `witness`
- Tribunal/regulator: `court_actor`, `regulator_contact`

## Permission Rules

- `MatterParticipant.access_scope` must be deny-by-default and explicitly
  granted.
- External participants are reference-only until portal or sharing access
  receives human approval.
- Adverse-side and tribunal/regulator participants must never receive internal
  work-product access by default.
- Ethical-wall membership must override role defaults.
- Matter role changes affecting owner, billing, external visibility, conflict,
  or ethical-wall state require human review evidence.

## Audit Events

- `people.matter_participant.proposed`
- `people.matter_participant.activated`
- `people.matter_participant.role_changed`
- `people.matter_participant.access_scope_reviewed`
- `people.matter_participant.blocked`
- `people.matter_participant.deactivated`

