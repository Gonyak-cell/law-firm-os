# Approval Governance Decision Brief

Status: blocked_pending_owner_approval
Work package: LT-L1-W05
TUW: LT-L1-W05-T01
Prepared at: 2026-06-18
Review policy: review_waived_by_user

## Boundary

This brief is a decision input only. It does not add an `L1-5` row to
`docs/launch/launch-decision-register.md`, does not decide the go-live approval
governance, and does not provide a G10 signoff artifact.

Claude, Codex, Hermes, validators, and generated reports can provide evidence,
review findings, and construction-inspection inputs. They have no authority to approve go-live, substitute for owner signature, or waive human acceptance.

## Required Decision

Launch TUW authority requires the owner to decide:

| Required field | Required owner-provided value |
| --- | --- |
| Approval model | Adopt the recommended joint signoff model or record an explicit changed model. |
| Human approver roles | Named real-person roles for final go-live approval. |
| Signoff artifact format | The signed document form and preservation location. |
| Approval basis | Evidence scope that approvers must review before signing. |
| Date and signature reference | Decision date plus signature or equivalent approval evidence reference. |

Until those fields are supplied, `LT-L1-W05-T01`, G10, and downstream go/no-go
activities remain blocked.

## Candidate Approval Model

Recommended candidate, not decided:

| Approval lane | Candidate approver role | Required scope before signing |
| --- | --- | --- |
| Business/legal go-live approval | Managing Partner | G1, G3, G7, G8, G9, and G10 evidence; go-live/no-go findings; open deferrals. |
| System and operations approval | AMIC System Admin | G2, G4, G5, G6, G8, G9, and G10 evidence; cutover runbook; rollback readiness. |
| Security acceptance input | Security owner or delegated security reviewer | L5 security acceptance, pentest adjudication, P0/P1 zero state, break-glass controls. |
| Pilot readiness input | Pilot owner partner | Pilot roster, training completion, support channel, and go-live communications readiness. |

The launch plan recommends Managing Partner plus System Admin joint signoff for
G10. The owner may adopt that model or choose a different model, but the
decision register must make the adoption or change explicit.

## Candidate Signoff Artifact Format

Proposed artifact form, not issued:

| Field | Required value in final signoff artifact |
| --- | --- |
| Artifact title | Law Firm OS Wave 1 Go-Live Approval Signoff |
| Decision id | L1-5 |
| Evidence package reviewed | List of G1-G10 evidence paths and go/no-go meeting record. |
| Approver role and real name | One row per required approver. |
| Decision | Approve go-live, no-go, or approve with explicit owner deferral. |
| Open findings | P0/P1 count, P2/P3 deferrals, owner disposition, target phase. |
| Date and timestamp | Date plus timezone. |
| Signature reference | Signed PDF path, e-signature envelope id, or equivalent owner-approved record. |
| Preservation location | Owner-approved secure record store plus repository pointer to non-sensitive summary. |

The repository may store only a non-sensitive summary unless the owner approves
storing the signed artifact in-repo.

## Human Acceptance Mapping

| Requirement source | Approval governance implication |
| --- | --- |
| `docs/goal-closeout-protocol.md` | Goal closeout requires construction inspection and human acceptance boundaries before completion claims. |
| `workbook/matter-post-cp-launch-plan.md` L8 G10 | G10 requires designated human approver joint signoff artifact. |
| `workbook/launch-tuw/00_마스터_출시피라미드_스키마_레지스트리.md` EXT-OWNER-APPROVAL | The external dependency is human approver signoff, not agent review. |
| `docs/launch/launch-decision-register.md` | Only `decided` or timed `deferred` rows are allowed; pending states stay in closeout evidence. |

## Decision Register Draft Input

Do not paste this into the register until owner evidence exists.

| 결정ID | 제목 | owner(실명 역할) | 결정 | 근거 | 일자 | 승인 서명 | 상태 |
|---|---|---|---|---|---|---|---|
| L1-5 | go-live approval governance | owner_supplied_real_person_roles_required | owner_decision_required | LT-L1-W05 decision brief + G10 launch plan requirement | owner_date_required | owner_signature_reference_required | decided_or_timed_deferred_only |

## Blocked State

This brief leaves `LT-L1-W05-T01` blocked because the following are not present:

| Missing evidence | Blocking effect |
| --- | --- |
| Owner-selected approval model | Cannot claim L1-5 decision. |
| Real-person approver roles | Cannot satisfy the 실명 역할 requirement. |
| Final signoff artifact format and preservation location | Cannot issue `docs/launch/approval-governance.md` as G10 source. |
| Approval signature reference | Cannot satisfy G10 or downstream go/no-go signoff. |
