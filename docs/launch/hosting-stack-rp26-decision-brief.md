# Hosting Stack And RP26 Scoping Decision Brief

Status: blocked_pending_owner_hosting_decision
Work package: LT-L1-W06
TUW: LT-L1-W06-T01/T02 preparation
Prepared at: 2026-06-18
Review policy: review_waived_by_user

## Boundary

This brief is a decision input only. It does not add `L1-6a` or `L1-6b` rows
to `docs/launch/launch-decision-register.md`, does not choose cloud or on-prem,
does not choose any database, search/vector, WORM, monitoring, or hosting
provider, and does not satisfy the L3 hosting/topology entry condition.

## L1-6a Required Hosting Stack Decision

| Decision field | Required owner-provided value |
| --- | --- |
| Hosting model | One of: on-prem server, cloud, or explicitly bounded hybrid. |
| Entra/Graph proximity assessment | Comparison note including Azure-as-natural-candidate evaluation without treating it as preselected. |
| Relational DB product or method | Product/service plus managed/self-hosted operation model. |
| Search/vector index product or method | Full-text and vector/RAG index path, including permission trimming implication. |
| WORM audit storage method | Append-only or WORM-equivalent audit event storage and legal-hold purge block approach. |
| Object/document original boundary | SharePoint/OneDrive vs object-store copy boundary and file_ref impact. |
| Backup/DR baseline | Starting RPO/RTO proposal or explicit handoff to L3-W05 approval. |
| Monitoring/SLO stack input | Observability candidate constraints for L3-W06. |
| Approval evidence | Owner role, decision date, basis, and signature reference. |

## Stack Component Checklist

| Component | Current decision state | Downstream blocked work |
| --- | --- | --- |
| Hosting model | owner_decision_required | L3-W02 deployment topology, L3-W07 M365 routing, L3-W10 integration rehearsals |
| Relational DB | owner_decision_required | L2-W01 schema, persistence, fixtures, integration tests |
| Search/vector index | owner_decision_required | L2-W04 search/document workspace, L5 search trimming tests |
| WORM audit store | owner_decision_required | L3-W04 WORM config, L5-W05 audit chain operation verification |
| Ledger/index/cache stores | owner_decision_required | L3-W04 store provisioning and L2 runtime dependency |
| Backup/DR targets | owner_decision_required | L3-W05 RPO/RTO, L5-W07 recovery rehearsal, G4 evidence |
| Monitoring/SLO | owner_decision_required | L3-W06 monitoring stack, L6 incident runbook triggers |

## L1-6b RP26 Scoping Input

This is a scoping input only. It does not decide applicability or deferral.

| RP26 item | Internal Wave 1 likely treatment to be decided by owner | Required evidence before marking applied or deferred |
| --- | --- | --- |
| SSO | candidate_internal_go_live_required | Entra/login design, staging E2E, owner approval |
| MFA | candidate_internal_go_live_required | MFA policy, high-risk access rule, test evidence |
| SCIM | candidate_wave4_deferral_or_internal_apply_decision_required | Explicit apply/defer owner decision and deprovision trigger |
| Resource isolation | candidate_internal_go_live_required | Tenant/resource boundary, no cross-route tenant resources evidence |
| Key management | candidate_internal_go_live_required | Secret-safe operation, key rotation owner, access logs |
| Rate limiting | candidate_internal_go_live_required | Per-tenant/user limits, abuse telemetry, failure-mode rule |
| Security monitoring | candidate_internal_go_live_required | Actionable telemetry, alert owner, incident runbook link |
| No cross-route tenant resources | candidate_internal_go_live_required | Test or audit evidence that tenant resources cannot cross routes |
| Strong admin auth | candidate_internal_go_live_required | Admin auth policy, MFA/role evidence |
| SCIM deprovision | candidate_wave4_deferral_or_internal_apply_decision_required | Deprovision flow or timed deferral with revisit gate |
| Secret-safe operation | candidate_internal_go_live_required | Secret storage, no secret logging, rotation evidence |
| Actionable security telemetry | candidate_internal_go_live_required | Alert catalogue, owner, runbook trigger |

## Internal Go-Live Minimum Set

The launch plan identifies these as internal go-live mandatory or near-mandatory
inputs to the L1-6 decision:

| Minimum item | Required treatment |
| --- | --- |
| SSO/MFA | Apply or record an owner-approved exception with compensating control. |
| Incident response | Apply through L6 runbook and monitoring trigger path. |
| Rollback | Apply through L3/L8 cutover rollback and L5 recovery rehearsal path. |
| Backup | Apply through L3-W05 RPO/RTO approval and restore rehearsal path. |

## Decision Register Draft Input

Do not paste these rows into the launch decision register until owner evidence exists.

| 결정ID | 제목 | owner(실명 역할) | 결정 | 근거 | 일자 | 승인 서명 | 상태 |
|---|---|---|---|---|---|---|---|
| L1-6a | hosting and stack decision | owner_supplied_real_person_role_required | owner_hosting_stack_decision_required | Entra/Graph proximity + DB/index/WORM evidence required | owner_date_required | owner_signature_reference_required | decided_only |
| L1-6b | RP26 internal go-live scoping | owner_supplied_real_person_role_required | owner_apply_defer_matrix_required | RP26 item matrix + Wave 4 trigger for each deferral required | owner_date_required | owner_signature_reference_required | decided_only |

## Blocked State

| Blocked artifact or phase | Reason |
| --- | --- |
| `docs/launch/hosting-stack-decision.md` | Cannot issue without L1-6a owner decision. |
| `docs/launch/rp26-scoping-record.md` | Cannot issue without L1-6b owner decision. |
| L3 entry | Hosting/topology is not decided. |
| L2 persistence work | DB product/method is not decided. |
| L3-W04 WORM store | WORM audit storage method is not decided. |
| L1-W07 final budget | Hosting, DB, WORM, and monitoring cost inputs remain quote-blocked. |
