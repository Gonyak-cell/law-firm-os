# LCX-PPL-02.04 Client Contact Contract

Date: 2026-06-24  
Program: `LCX-PPL Full Reflection`  
TUW: `LCX-PPL-02.04`

## Boundary

This contract links Client records to People records. It is contract-ready only;
it does not complete runtime APIs, UI backlinks, portal access, or production
readiness.

Current claim state:

- Runtime-ready candidate complete: `false`
- Production ready: `false`
- Go-live approved: `false`
- Enterprise trust approved: `false`
- Client contact runtime complete: `false`
- Portal access runtime complete: `false`

## Objects

| Object | Purpose |
| --- | --- |
| `ClientContact` | Person-to-client role record with decision role, relationship owner, portal state, billing state, tenant scope, and audit ref. |
| `ClientContactLedger` | Auditable change ledger for contact creation, role changes, portal review, revocation, merge, and historical correction. |
| `ClientPortalAccessBoundary` | Review-gated boundary for client-visible Matter and document access. |

## Contact Roles

- `general_contact`
- `legal_team`
- `decision_maker`
- `billing_contact`
- `business_sponsor`
- `technical_contact`
- `compliance_contact`
- `portal_user`
- `former_contact`

## Portal Access Rules

- Portal access is never granted by contact creation alone.
- Portal access requires explicit reviewer evidence.
- Client-visible Matter/document scope must be allowlisted.
- Portal access changes must append audit evidence and remain tenant-scoped.

## Backlink Requirements

| Source Surface | Target Surface | Required Behavior |
| --- | --- | --- |
| Client detail | People detail | Client detail lists related ClientContact People records and opens People detail without exposing restricted fields. |
| People detail | Client detail | People detail lists related Clients, contact roles, relationship owner, portal access state, and billing contact state. |
| Matter detail | People detail | Matter participants resolve to People records while preserving representation side and access scope. |

## CRM Alignment

The contract aligns with existing Client/CRM surfaces:

- Client accounts
- Client contacts
- Account-contact relationship read
- Contact create
- Contact patch
- Duplicate merge proposal review

Runtime implementation must preserve audit, rollback, restricted-field, and
review-gated portal boundaries.

## Audit Events

- `people.client_contact.created`
- `people.client_contact.role_changed`
- `people.client_contact.owner_changed`
- `people.client_contact.portal_access_requested`
- `people.client_contact.portal_access_reviewed`
- `people.client_contact.portal_access_revoked`
- `people.client_contact.deactivated`

