# Matter Home IA

Status: draft_completed_pending_l1_w01_scope_decision
Work package: LT-L4-W01
TUW: LT-L4-W01-T02
Prepared at: 2026-06-18
Review policy: review_waived_by_user

## Boundary

This IA document defines the Matter Home implementation contract for later UI
work. It does not implement `apps/web`, does not open a runtime route, and does
not claim L4-W01 completion. Because `LT-L4-W01` is provisional and the launch
decision register still lacks an owner-decided Wave 1 scope row, this artifact
is implementation-ready as a draft but remains pending owner scope confirmation.

## Source Alignment

| Source | Use |
| --- | --- |
| `workbook/matter_dev_docs/21_UI_화면_사용자흐름.md` §2 | Source list for Matter Home 11 areas. |
| `contracts/matter-core-contract.json` `api_interface_ui_state_bridge` | Descriptor source for request/response fields and UI states. |
| `contracts/permission-kernel-contract.json` | Permission state vocabulary and fail-closed handling. |
| `docs/launch/runtime-gap-report.md` | Backend runtime dependency evidence: matter/documents/Outlook filing/work queue routes are partial or absent. |

## Area IA Table

| ID | Area | Data source contract/API field | Empty state copy | Permission state handling | Backend WP dependency | Implementation split |
| --- | --- | --- | --- | --- | --- | --- |
| MH-01 | Matter Summary | `contracts/matter-core-contract.json` `api_interface_ui_state_bridge`; future `GET /matters/{id}/home.summary` with client, counterparty, type, stage, lead_lawyer, confidentiality | No matter summary is available for this matter. | allow: show summary; denied: replace whole Matter Home with no-access state; review_required: show review-required state and suppress values. | LT-L2-W04 matter domain runtime; LT-L2-W02 permission context | T03 core 5 |
| MH-02 | Today's Actions | Future `GET /matters/{id}/home.actions` joining MatterTask, review queue, approval requests | No actions due today. | allow: show sorted actions; denied: hide action list; review_required: show review-required state with no action details. | LT-L2-W03 write APIs; LT-L2-W04 work queue read model | T03 core 5 |
| MH-03 | Critical Deadlines | Future `GET /matters/{id}/home.deadlines` for signing, closing, court, filing, client response | No critical deadlines are currently tracked. | allow: show deadline cards; denied: hide deadlines; review_required: show review-required state with deadline count suppressed. | LT-L2-W04 deadline runtime; LT-L2-W03 audit-backed state changes | T03 core 5 |
| MH-04 | Open Issues | Future `GET /matters/{id}/home.issues` with risk_level, owner, next_action | No open issues are tracked. | allow: show issue rows; denied: hide issues; review_required: show review-required state and suppress source/position details. | LT-L2-W04 issue runtime; LT-L4-W01 issue ledger IA | T03 core 5 |
| MH-05 | Recent Documents | Future `GET /matters/{id}/home.documents` with status, version, source, qc_result | No recent documents are filed. | allow: show document rows; denied: hide rows and counts; review_required: show review-required state and suppress file metadata. | LT-L2-W04 document runtime; LT-L2-W03 document filing write path | T03 core 5 |
| MH-06 | Recent Emails | Future `GET /matters/{id}/home.emails` with filed_thread, pending_response | No filed emails are linked to this matter. | allow: show filed threads only; denied: hide rows and counts; review_required: show review-required state and suppress sender/subject. | LT-L2-W03 Outlook filing write path; LT-L3-W09 Add-in deployment | T04 collaboration/status 6 |
| MH-07 | Client Pending | Future `GET /matters/{id}/home.client_pending` for client confirmations and missing inputs | No client items are pending. | allow: show client-pending cards; denied: hide client details; review_required: show review-required state without exposing request text. | LT-L2-W04 matter workflow runtime; LT-L2-W02 permission context | T04 collaboration/status 6 |
| MH-08 | Counterparty Pending | Future `GET /matters/{id}/home.counterparty_pending` for reply waits and negotiation blockers | No counterparty items are pending. | allow: show pending items; denied: hide counterparty details; review_required: show review-required state and suppress message context. | LT-L2-W04 matter workflow runtime; LT-L2-W03 correspondence/audit events | T04 collaboration/status 6 |
| MH-09 | AI Candidates | Wave 1 placeholder only; no production AI prompt/output source; later Wave 2 candidate queue | AI candidates are off for Wave 1. | allow: show non-interactive dark-launch placeholder; denied: show no data; review_required: show no candidate content. Interactive controls count must be 0 in Wave 1. | LT-L1-W02 OQ-003/OQ-014; LT-L1-W03 retention policy; later Wave 2 gate | T04 collaboration/status 6 |
| MH-10 | Billing/Workload | Future `GET /matters/{id}/home.billing_workload` with time, budget, team workload | No billing or workload summary is available. | allow: show summary; denied: mask financial/workload data; review_required: show review-required state and suppress values. | LT-L2-W04 billing/workload read model; LT-L2-W02 permission context | T04 collaboration/status 6 |
| MH-11 | Knowledge Candidates | Future `GET /matters/{id}/home.knowledge_candidates` with candidate artifact/source links | No knowledge candidates are queued. | allow: show candidates; denied: hide sources; review_required: show review-required state and suppress source text. | LT-L2-W04 knowledge candidate read model; LT-L5 security source-gating | T04 collaboration/status 6 |

## Permission States

Matter Home must treat permission as fail-closed:

| State | Screen rule |
| --- | --- |
| allow | Render only the fields authorized for the current principal and matter. |
| denied | Suppress all area data. Whole-screen denial is used for matter non-members; area-level denial masks only that area. |
| review_required | Render a distinct review-required state and suppress underlying matter data until the review is resolved. |

The permission vocabulary is aligned to the launch acceptance wording
`allow/denied/review_required` and to the contract vocabulary where denied maps
to `deny`.

## Implementation Split

| Split | Areas | Rationale |
| --- | --- | --- |
| T03 core 5 | Matter Summary; Today's Actions; Critical Deadlines; Open Issues; Recent Documents | These form the minimum Matter Home read surface and can be rendered from core matter, task, deadline, issue, and document summaries. |
| T04 collaboration/status 6 | Recent Emails; Client Pending; Counterparty Pending; AI Candidates; Billing/Workload; Knowledge Candidates | These depend on Outlook filing, workflow collaboration, AI dark-launch, billing/workload, and knowledge candidate surfaces. |

## Backend Dependency Summary

| Backend WP | Matter Home dependency |
| --- | --- |
| LT-L2-W02 | Server-side permission context and area-level allow/denied/review_required evaluation. |
| LT-L2-W03 | Non-bypassable write APIs and audit-backed state changes for documents, emails, actions, and workflow. |
| LT-L2-W04 | Runtimeized bounded contexts and read models for Matter Home data. |
| LT-L3-W09 | Outlook Add-in deployment path feeding Recent Emails. |
| LT-L5 | Security acceptance, source gating, and no-leak validation before go-live. |

## Wave 1 AI Boundary

AI Candidates is a dark-launch placeholder in Wave 1:

| Rule | Required behavior |
| --- | --- |
| No prompt submission | The area exposes no prompt input, send button, source picker, or generated output controls. |
| No production AI data | The area renders no production prompt, output, or candidate payload. |
| Later gate only | OQ-003, OQ-014, EXT-LEGAL-AI, and the Wave 2 AI release gate must complete before interactive AI candidate behavior is introduced. |
