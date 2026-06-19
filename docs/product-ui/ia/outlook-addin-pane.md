# Outlook Add-in Task Pane IA

Status: draft_blocked_pending_mat_dec_03_and_m365_decisions
Work package: LT-L4-W01
TUW: LT-L4-W01-T12
Prepared at: 2026-06-18
Review policy: review_waived_by_user

## Boundary

This IA document defines the Outlook Add-in Task Pane screen-state contract for
later implementation. It does not create `apps/addin`, does not modify
`apps/web`, does not create an Outlook manifest, does not request Microsoft
Graph scopes, and does not claim LT-L4-W01 or LT-L4-W01-T12 completion.

Attachment storage and original-file behavior remain blocked because
`MAT-DEC-03` is still `blocked_pending_storage_decision`. Microsoft Graph scope,
admin consent, and Add-in deployment/manifest format also remain owner-decision
items in `docs/launch/critical-oq-prd8-decision-round-brief.md`.

## Source Alignment

| Source | Use |
| --- | --- |
| `workbook/matter_dev_docs/21_UI_화면_사용자흐름.md` section 3 | Source 8-step Outlook Filing Flow mapped to pane states. |
| `workbook/matter_dev_docs/08_Microsoft_365_Outlook_Addin_Spec.md` | Expanded Add-in direction, read/compose capabilities, attachment filing flow, Smart Alerts, and release gate. |
| `docs/launch/mat-dec-03-storage-decision-brief.md` | Current storage state: `blocked_pending_storage_decision`; attachment binary storage target is not approved. |
| `docs/launch/critical-oq-prd8-decision-round-brief.md` | OQ-001, OQ-002, and PRD8-2 decisions remain owner-required for SharePoint topology, Graph scopes/admin consent, and Add-in deployment. |
| `contracts/email-dms-m365-runtime-contract.json` | Historical descriptor lineage for filing and attachment flow; no runtime behavior is claimed by this IA. |
| `contracts/permission-kernel-contract.json` | Permission state vocabulary and fail-closed handling. |

## Pane State Mapping

| ID | Source flow step | Pane state | Required inputs | Primary action | Output / next state | Permission handling | Backend WP dependency |
| --- | --- | --- | --- | --- | --- | --- | --- |
| OA-FLOW-01 | Email is opened | Read-mode bootstrap | Office item context, mailbox identity, tenant context | initialize pane | pane_loaded | allow: continue; denied: show no-access state; review_required: show review-required state without message metadata | LT-L3-W07 Graph scopes/admin consent; LT-L2-W02 auth/permission context |
| OA-FLOW-02 | Matter panel opens | Matter panel shell | item metadata, filing history lookup, current user | open matter panel | matter_lookup_ready | allow: show shell; denied: hide matter search; review_required: suppress message details | LT-L4-W01-T01 product routing; LT-L2-W04 matter read model |
| OA-FLOW-03 | Suggested matter is shown | Suggested matter list | subject, sender, recipients, thread, attachment hints | show suggestions | suggestion_review | allow: show permitted suggestions only; denied: show zero suggestions; review_required: require review before suggestion detail | LT-L2-W02 source-trimmed permissions; LT-L2-W04 matter search |
| OA-FLOW-04 | User selects matter | Matter selection confirmation | selected matter_id, reason, confidence/source hint | confirm selection | matter_selected | allow: select accessible matter; denied: block filing; review_required: hold selection pending review | LT-L2-W02 permission context; LT-L2-W03 write precheck |
| OA-FLOW-05 | Email filing occurs | Filing confirmation | selected matter, message identifiers, filing mode, audit hint | file email | email_filed_pending_attachments | allow: call filing write path when implemented; denied: block; review_required: route for review, no write-back | LT-L2-W03 email filing write API; LT-L2-W01 durable audit |
| OA-FLOW-06 | Attachments are selected and saved | Attachment picker | attachment list, selected files, provisional storage target, file_ref policy | save attachments | attachments_saved_or_skipped | allow: save only after storage decision; denied: hide attachment save; review_required: hold attachment save | LT-PRE-W03 MAT-DEC-03; LT-L3-W08 SharePoint provisioning; LT-L2-W03 document write path |
| OA-FLOW-07 | Task/deadline/issue is created or AI candidate is reviewed | Follow-up action panel | selected email/document source, action type, owner, due date, issue text | create task/deadline/issue or queue AI placeholder | followup_recorded | allow: write non-AI follow-up when implemented; denied: disable actions; review_required: route for review | LT-L2-W03 task/deadline/issue write APIs; Wave 2 AI gate for AI candidates |
| OA-FLOW-08 | Result is checked in Matter Home | Completion summary | filing result, document refs, follow-up refs, audit hint | show completion and Matter Home link | completed | allow: show safe refs; denied: hide linked object details; review_required: show pending-review completion | LT-L4-W01-T02 Matter Home IA; LT-L2-W04 read models |

## Attachment Storage Rule

These rules cite `docs/launch/mat-dec-03-storage-decision-brief.md`, status
`blocked_pending_storage_decision`.

| Rule | Required behavior while storage is pending |
| --- | --- |
| No final target claim | The pane must not state that attachments are definitively saved to SharePoint/OneDrive, object storage, or hybrid storage until MAT-DEC-03 is approved. |
| Provisional Plan A label | The M365 spec's SharePoint/OneDrive flow may be shown as "Plan A pending decision", not as an approved runtime rule. |
| No Graph write request | No Graph file write scope, upload call, or admin consent request is introduced by this IA. |
| file_ref placeholder only | Attachment save output is represented as a placeholder `file_ref` until storage, signed-link, retention, and audit rules are approved. |
| Partial state blocked | If attachment save fails in later runtime work, email filing must not leave orphan document/attachment mappings. |

## AI and Smart Alerts Boundary

| Item | Wave 1 rule |
| --- | --- |
| Suggested matter | Allowed only as permission-trimmed deterministic suggestions; no external AI decisioning is claimed by this IA. |
| AI summary | Wave 2 or later. In Wave 1, show no generated summary and no prompt/output controls. |
| AI task/deadline/issue candidates | Wave 2 or later. In Wave 1, non-AI task/deadline/issue creation may be designed, but AI candidates are placeholders only. |
| Smart Alerts | Wave 2 or later. The spec lists Smart Alerts, but launch plan moves Smart Alerts hard block to Wave 2. |

## Expanded Backend Checkpoints

The 8 pane states above compress the expanded M365 filing contract into
screen-facing checkpoints:

| Checkpoint | Source alignment |
| --- | --- |
| Message metadata read | Add-in spec Email Filing Flow steps 1-5. |
| Email object creation | Add-in spec Email Filing Flow step 6. |
| Attachment save | Add-in spec Email Filing Flow steps 7-8 and Attachment Filing Flow, blocked by MAT-DEC-03. |
| Relation creation | Add-in spec Email Filing Flow step 9. |
| Audit event | Add-in spec Email Filing Flow step 10 and release gate. |
| AI candidate | Add-in spec Email Filing Flow step 11, deferred to Wave 2. |

## Runtime Blockers

| Blocker | Evidence |
| --- | --- |
| Storage decision missing | MAT-DEC-03 is still `blocked_pending_storage_decision`. |
| Graph scope/admin consent missing | OQ-002 remains owner-decision-required. |
| Add-in deployment decision missing | PRD8-2 remains owner-decision-required. |
| No Add-in app claimed | This IA does not create `apps/addin`, manifest files, Office.js code, or task pane runtime. |
| No filing write API claimed | Email filing, attachment save, follow-up creation, and audit writes remain LT-L2/L3 dependencies. |

## Permission States

| State | Screen rule |
| --- | --- |
| allow | Render only authorized matter suggestions, filing actions, attachment metadata, and safe completion references. |
| denied | Hide matter suggestions and disable filing/actions; do not leak inaccessible matter names, counts, document refs, or message details. |
| review_required | Render a distinct review-required state and block final filing/write-back until review is resolved. |
