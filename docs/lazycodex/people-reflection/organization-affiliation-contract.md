# LCX-PPL-02.02 Organization And Affiliation Contract

Date: 2026-06-24  
Program: `LCX-PPL Full Reflection`  
TUW: `LCX-PPL-02.02`

## Boundary

This contract models organizations, affiliations, and role history for legal
People. It is contract-ready only; it does not complete runtime routes, UI, or
production readiness.

Current claim state:

- Runtime-ready candidate complete: `false`
- Production ready: `false`
- Go-live approved: `false`
- Enterprise trust approved: `false`
- Organization relationship runtime complete: `false`

## Objects

| Object | Purpose |
| --- | --- |
| `Organization` | Client organizations, affiliates, law firms, counterparties, expert firms, courts, arbitration institutions, regulators, vendors, and internal units. |
| `Affiliation` | The role a person holds in an organization, including active and historical roles. |
| `RoleHistory` | Auditable record of role/title/relationship changes over time. |

## Organization Types

- `client`
- `client_affiliate`
- `law_firm`
- `opposing_firm`
- `counterparty_entity`
- `expert_firm`
- `court`
- `arbitration_institution`
- `regulator`
- `vendor`
- `internal_firm_unit`

## Affiliation Rules

- A person may have more than one active affiliation when source evidence
  supports it.
- Historical affiliations must remain available for conflict and relationship
  review.
- Affiliations must be tenant-scoped and audit-linked.
- Changes touching conflict, billing, portal access, or ethical-wall state
  require human review evidence.

## High-Risk Relationships

The following relationship types require review before final state:

- `organization_parent_subsidiary`
- `organization_related_party`
- `organization_beneficial_owner`
- `organization_conflict_subject`

## Master Data Alignment

This contract aligns with existing Master Data primitives:

- `Party`
- `Entity`
- `Organization`
- `Person`
- `Relationship`
- `ContactPoint`

Runtime implementation must map this contract to those primitives without
exposing raw restricted values or claiming production readiness.

