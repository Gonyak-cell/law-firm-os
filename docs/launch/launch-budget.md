# LT-L1-W07 Launch Budget Draft

Status: draft_completed_pending_l1_w06_quotes
Work package: LT-L1-W07
TUW: LT-L1-W07-T01
Prepared at: 2026-06-18
Review policy: review_waived_by_user

## Purpose

This draft creates the launch budget collection surface for `LT-L1-W07-T02`
approval. It does not approve spend, select vendors, or fill external quotes
without owner evidence.

## Budget Table

| Line | Category | Budgeted amount | Quote status | Deadline / blocker | Basis |
| --- | --- | --- | --- | --- | --- |
| BUD-01 | 호스팅 | 견적 대기(LT-L1-W06 hosting decision 후 5영업일) | pending_l1_w06 | blocked_by_hosting_stack_decision | Cloud vs on-prem and environment count are not decided. |
| BUD-02 | DB | 견적 대기(LT-L1-W06 hosting decision 후 5영업일) | pending_l1_w06 | blocked_by_db_product_decision | Relational DB product and managed/self-hosted model are not decided. |
| BUD-03 | WORM 스토리지 | 견적 대기(LT-L1-W06 hosting decision 후 5영업일) | pending_l1_w06 | blocked_by_worm_store_decision | WORM audit store technology and retention model are not decided. |
| BUD-04 | 모니터링 | 견적 대기(LT-L1-W06 hosting decision 후 5영업일) | pending_l1_w06 | blocked_by_slo_monitoring_stack_decision | Observability stack and SLO metrics remain open. |
| BUD-05 | M365 라이선스 | 견적 대기(EXT-M365-ADMIN confirmation 후 5영업일) | pending_external_confirmation | blocked_by_m365_admin_access | Tenant/admin confirmation and user/license count are pending. |
| BUD-06 | 외부 AI API | 견적 대기(EXT-LEGAL-AI kickoff 및 OQ-003/OQ-014 결정 후 5영업일) | pending_external_legal_and_l1_decisions | blocked_by_ai_policy | Wave 1 AI remains off; provider routing and data policy are undecided. |
| BUD-07 | 침투테스트 | 견적 대기(EXT-PENTEST vendor outreach 후 5영업일) | pending_vendor_outreach | blocked_by_pentest_vendor_selection | Vendor outreach has not produced real quotes. |
| BUD-08 | 원격 저장소 | 견적 대기(LT-L3-W01 remote repo decision 후 3영업일) | pending_remote_repo_decision | blocked_by_remote_platform_decision | Remote platform, visibility, and branch protection model are not decided. |
| BUD-09 | 교육 | 견적 대기(LT-L1-W10 roster 및 L7 curriculum 확정 후 5영업일) | pending_pilot_and_training_scope | blocked_by_pilot_roster_and_curriculum | Pilot roster and role-based curriculum are still draft/pending. |
| BUD-10 | 리뷰 운영비 | USD 0 budgeted; historical benchmark USD 2,961 | review_waived_by_user | no_full_claude_review_budgeted | Historical CP benchmark: 987 packs x USD 3/pack = USD 2,961. User waived full Claude reviews from 2026-06-18 onward. |

## Totals

| Total type | Amount | Notes |
| --- | ---: | --- |
| Budgeted numeric subtotal | USD 0 | Only full Claude review has a calculable current budget, and it is waived. |
| Historical CP review benchmark | USD 2,961 | 987 closed packs x USD 3/pack; not budgeted unless owner reinstates full reviews. |
| Quote-pending lines | 9 | BUD-01 through BUD-09 require decisions or external evidence. |
| Approval status | not_approved | Approval belongs to `LT-L1-W07-T02`. |

## Quote Collection Queue

| Category | Required decision or evidence before quote |
| --- | --- |
| 호스팅 / DB / WORM 스토리지 / 모니터링 | `LT-L1-W06` hosting-stack decision. |
| M365 라이선스 | `LT-PRE-W06` M365 admin access confirmation and pilot/full user count. |
| 외부 AI API | `OQ-003` data transfer policy, `OQ-014` retention/masking policy, and legal review kickoff/result path. |
| 침투테스트 | `EXT-PENTEST` vendor outreach with at least one real candidate. |
| 원격 저장소 | `LT-L3-W01-T02` remote platform/access/branch-protection decision. |
| 교육 | `LT-L1-W10` pilot roster and L7 role-based training scope. |

## Dependency Note

This budget remains a draft until `LT-L1-W06` and external quote evidence exist.
Codex did not create vendor prices, owner approvals, or real spending authority.
