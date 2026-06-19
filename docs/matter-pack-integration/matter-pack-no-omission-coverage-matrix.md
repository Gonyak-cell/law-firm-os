# Matter-Pack No-Omission Coverage Matrix (A-4)

Status: planning-only. Source heading rows are generated from workbook/matter_dev_docs on 2026-06-11.

## Requirement Coverage Matrix

| metric | count | evidence |
| --- | --- | --- |
| source_documents | 25 | matter-pack-source-index.md §1 |
| source_headings_classified_once | 201 | matter-pack-source-index.md §2.1 |
| requirement_candidate_rows | 200 | matter-pack-requirement-candidates.md |
| silent_omission_count | 0 | declared by this matrix |
| forbidden_scope_direct_insertions | 0 | contracts/packages/closed packs untouched by master track |

## Must Not Miss Named Object Groups

| group | expected_count | coverage_ref | must_not_miss |
| --- | --- | --- | --- |
| Domain objects | 17 | MAT-REQ-CORE-101.. | complete |
| Roles | 12 | MAT-REQ-PERM role rows | complete |
| Audit event classes | 12 | MAT-REQ-PERM audit rows | complete |
| Permission evaluation steps | 10 | MAT-REQ-PERM evaluation rows | complete |
| Practice pack modules | 32 | MAT-REQ-ISSUE rows | complete |
| HR objects | 16 | MAT-REQ-HR-101..116 | complete |
| UI screens | 14 | MAT-REQ-UI-101..114 | complete |
| API endpoints plus events | 31 | MAT-REQ-API rows | complete |

## Family x Classification Checksum

| family | classification | section_count |
| --- | --- | --- |
| GOV | implemented_by_existing_plan | 0 |
| GOV | covered_but_requires_trace | 46 |
| GOV | adapt_required | 0 |
| GOV | adapt_required_pending_user_decision | 9 |
| GOV | new_required | 4 |
| GOV | defer_with_revisit_gate | 0 |
| GOV | reject_with_reason | 32 |
| CORE | implemented_by_existing_plan | 0 |
| CORE | covered_but_requires_trace | 4 |
| CORE | adapt_required | 3 |
| CORE | adapt_required_pending_user_decision | 9 |
| CORE | new_required | 0 |
| CORE | defer_with_revisit_gate | 0 |
| CORE | reject_with_reason | 0 |
| PERM | implemented_by_existing_plan | 0 |
| PERM | covered_but_requires_trace | 10 |
| PERM | adapt_required | 0 |
| PERM | adapt_required_pending_user_decision | 0 |
| PERM | new_required | 0 |
| PERM | defer_with_revisit_gate | 0 |
| PERM | reject_with_reason | 0 |
| M365 | implemented_by_existing_plan | 0 |
| M365 | covered_but_requires_trace | 0 |
| M365 | adapt_required | 0 |
| M365 | adapt_required_pending_user_decision | 0 |
| M365 | new_required | 0 |
| M365 | defer_with_revisit_gate | 11 |
| M365 | reject_with_reason | 0 |
| WORK | implemented_by_existing_plan | 0 |
| WORK | covered_but_requires_trace | 0 |
| WORK | adapt_required | 0 |
| WORK | adapt_required_pending_user_decision | 0 |
| WORK | new_required | 0 |
| WORK | defer_with_revisit_gate | 0 |
| WORK | reject_with_reason | 0 |
| ISSUE | implemented_by_existing_plan | 0 |
| ISSUE | covered_but_requires_trace | 0 |
| ISSUE | adapt_required | 0 |
| ISSUE | adapt_required_pending_user_decision | 0 |
| ISSUE | new_required | 7 |
| ISSUE | defer_with_revisit_gate | 0 |
| ISSUE | reject_with_reason | 0 |
| PORTAL | implemented_by_existing_plan | 0 |
| PORTAL | covered_but_requires_trace | 0 |
| PORTAL | adapt_required | 0 |
| PORTAL | adapt_required_pending_user_decision | 0 |
| PORTAL | new_required | 8 |
| PORTAL | defer_with_revisit_gate | 0 |
| PORTAL | reject_with_reason | 0 |
| VAULT | implemented_by_existing_plan | 0 |
| VAULT | covered_but_requires_trace | 0 |
| VAULT | adapt_required | 0 |
| VAULT | adapt_required_pending_user_decision | 0 |
| VAULT | new_required | 9 |
| VAULT | defer_with_revisit_gate | 0 |
| VAULT | reject_with_reason | 0 |
| AIGW | implemented_by_existing_plan | 0 |
| AIGW | covered_but_requires_trace | 0 |
| AIGW | adapt_required | 0 |
| AIGW | adapt_required_pending_user_decision | 0 |
| AIGW | new_required | 9 |
| AIGW | defer_with_revisit_gate | 0 |
| AIGW | reject_with_reason | 0 |
| DRAFT | implemented_by_existing_plan | 0 |
| DRAFT | covered_but_requires_trace | 0 |
| DRAFT | adapt_required | 0 |
| DRAFT | adapt_required_pending_user_decision | 0 |
| DRAFT | new_required | 7 |
| DRAFT | defer_with_revisit_gate | 0 |
| DRAFT | reject_with_reason | 0 |
| BILL | implemented_by_existing_plan | 0 |
| BILL | covered_but_requires_trace | 0 |
| BILL | adapt_required | 0 |
| BILL | adapt_required_pending_user_decision | 0 |
| BILL | new_required | 7 |
| BILL | defer_with_revisit_gate | 0 |
| BILL | reject_with_reason | 0 |
| ADMIN | implemented_by_existing_plan | 0 |
| ADMIN | covered_but_requires_trace | 0 |
| ADMIN | adapt_required | 0 |
| ADMIN | adapt_required_pending_user_decision | 0 |
| ADMIN | new_required | 0 |
| ADMIN | defer_with_revisit_gate | 0 |
| ADMIN | reject_with_reason | 0 |
| INTEG | implemented_by_existing_plan | 0 |
| INTEG | covered_but_requires_trace | 0 |
| INTEG | adapt_required | 0 |
| INTEG | adapt_required_pending_user_decision | 0 |
| INTEG | new_required | 0 |
| INTEG | defer_with_revisit_gate | 0 |
| INTEG | reject_with_reason | 0 |
| HARD | implemented_by_existing_plan | 0 |
| HARD | covered_but_requires_trace | 0 |
| HARD | adapt_required | 0 |
| HARD | adapt_required_pending_user_decision | 0 |
| HARD | new_required | 0 |
| HARD | defer_with_revisit_gate | 0 |
| HARD | reject_with_reason | 0 |
| HR | implemented_by_existing_plan | 0 |
| HR | covered_but_requires_trace | 0 |
| HR | adapt_required | 0 |
| HR | adapt_required_pending_user_decision | 0 |
| HR | new_required | 10 |
| HR | defer_with_revisit_gate | 0 |
| HR | reject_with_reason | 0 |
| UI | implemented_by_existing_plan | 0 |
| UI | covered_but_requires_trace | 0 |
| UI | adapt_required | 0 |
| UI | adapt_required_pending_user_decision | 0 |
| UI | new_required | 9 |
| UI | defer_with_revisit_gate | 0 |
| UI | reject_with_reason | 0 |
| API | implemented_by_existing_plan | 0 |
| API | covered_but_requires_trace | 0 |
| API | adapt_required | 0 |
| API | adapt_required_pending_user_decision | 0 |
| API | new_required | 7 |
| API | defer_with_revisit_gate | 0 |
| API | reject_with_reason | 0 |

The coverage_summary in matter-pack-overlay-closeout-pack-map.json mirrors these counts.
