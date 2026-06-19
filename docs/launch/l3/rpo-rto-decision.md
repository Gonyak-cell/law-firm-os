# RPO/RTO Decision Brief

Status: proposal_blocked_pending_owner_approval
Work package: LT-L3-W05
TUW: LT-L3-W05-T01
Prepared at: 2026-06-18
Review policy: review_waived_by_user

## Boundary

This document is a decision brief only. It records candidate backup and
recovery targets so downstream backup, restore, and G4 evidence work can be
planned, but it does not approve RPO/RTO targets, does not add a row to
`docs/launch/launch-decision-register.md`, does not provision backup
automation, does not execute a restore rehearsal, and does not authorize
production or real-client data use.

LT-L3-W05-T01 remains blocked until an owner supplies the approved RPO/RTO
values, owner role, basis, decision date, and approval signature reference.

## Candidate Target Baseline

The launch plan proposes starting from RPO <= 24h and RTO <= 4h because R13
hardening does not contain approved backup/DR numbers. The rows below are
candidate targets, not approved launch criteria.

| Target ID | Store or recovery domain | Candidate RPO | Candidate RTO | Basis | Decision state |
| --- | --- | ---: | ---: | --- | --- |
| RPO-RTO-DB | Relational DB / core transactional store | <= 24h | <= 4h | Internal pilot tolerance, small initial tenant scope, and need for a concrete G4 measurement anchor. | pending_owner_approval |
| RPO-RTO-AUDIT | WORM audit store / audit event chain | <= 24h | <= 4h | Audit continuity should not be weaker than the DB baseline; restored chain must verify before recovery can pass. | pending_owner_approval |
| RPO-RTO-INDEX | Search, vector, and derived indexes | <= 24h source recoverability | <= 8h rebuild or resync | Indexes are derived from DB, audit, and document metadata; rebuild can be delegated if source stores are intact. | pending_owner_approval |
| RPO-RTO-FILES | Document originals / file source of truth | pending MAT-DEC-03 | pending MAT-DEC-03 | If SharePoint/OneDrive is selected, original retention and restore boundaries are delegated to M365 policy with Law Firm OS evidence pointers; if object storage is selected, Law Firm OS must own backup and restore. | blocked_pending_mat_dec_03 |

## Required Approval Fields

These fields must be owner-supplied before this brief can become the approved
LT-L3-W05-T01 decision record.

| Field | Required value | Current value |
| --- | --- | --- |
| Owner real-person role | Named accountable business or technical owner role with authority over launch DR criteria. | pending_owner_approval |
| Approved RPO values | Time-based RPO values for DB, audit, index, and document-original boundary. | proposal_only |
| Approved RTO values | Time-based RTO values for DB, audit, index, and document-original boundary. | proposal_only |
| Basis | Data loss tolerance, operational recovery expectations, staffing coverage, and storage ownership rationale. | proposal_basis_drafted |
| Decision date | Date of approval. | pending_owner_approval |
| Approval signature reference | Signature, meeting decision, ticket, or equivalent approval record. | pending_owner_approval |
| Launch decision register row | Cross-reference in `docs/launch/launch-decision-register.md`. | not_created_until_owner_evidence_exists |

## Dependency Notes

| Dependency | Current state | Impact on RPO/RTO approval |
| --- | --- | --- |
| LT-L1-W06 hosting and stack decision | `docs/launch/hosting-stack-rp26-decision-brief.md` is blocked pending owner decision. | Backup medium, DB product, WORM store, and offsite strategy cannot be final. |
| LT-PRE-W03 MAT-DEC-03 storage decision | `docs/launch/mat-dec-03-storage-decision-brief.md` is blocked pending storage decision. | File-original recovery boundary cannot be finalized. |
| LT-L3-W04 WORM audit store | Not provisioned. | Audit restore target remains a candidate until WORM store behavior is measured. |
| LT-L3-W06 monitoring/SLO | Not selected. | Backup success and restore-readiness alerts cannot be wired. |

## Follow-On Work

| Follow-on TUW | Required use of this brief |
| --- | --- |
| LT-L3-W05-T02 | Must compare backup schedule frequency against approved RPO values, not proposal values. |
| LT-L3-W05-T03 | Must measure restore duration and data-loss window against approved RTO/RPO values. |
| LT-L3-W05-T04 | Must cite the approved decision and keep runbook numbers identical. |
| LT-L5-W07-T02 | Must perform restore rehearsal with measured RPO/RTO and verify audit chain integrity. |
| LT-L8-W04 | Must assemble G4 evidence only after approved targets and measured pass results exist. |

## Non-Weakening Rule

Any later relaxation of approved RPO or RTO values must be reapproved in the
launch decision register and must include a non-weakening rationale for audit,
legal hold, and matter continuity obligations.
