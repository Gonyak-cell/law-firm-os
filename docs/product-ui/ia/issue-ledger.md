# Issue Ledger IA

Status: draft_completed_pending_l1_w01_scope_and_pre_w04_disposition
Work package: LT-L4-W01
TUW: LT-L4-W01-T15
Prepared at: 2026-06-18
Review policy: review_waived_by_user

## Boundary

This IA document defines the Issue Ledger screen contract for later UI work. It
does not implement `apps/web`, does not open an Issue Ledger route, does not
create write APIs, and does not claim LT-L4-W01 or LT-L4-W01-T15 completion.

Issue/practice coverage is still marked partial in
`docs/launch/gap-five-area-coverage-matrix.md`. The state model below is an IA
draft for implementation planning only; it is not an owner-approved final enum
or overlay admission decision.

## Source Alignment

| Source | Use |
| --- | --- |
| `workbook/matter_dev_docs/21_UI_화면_사용자흐름.md` section 4 | Source flow: issue candidate discovery through knowledge-candidate creation. |
| `workbook/matter_dev_docs/21_UI_화면_사용자흐름.md` section 1 | Source row: Issue Ledger shows issue status, risk, source, position, proposed language, and final resolution. |
| `workbook/matter-post-cp-launch-plan.md` L1 and L4 sections | Wave 1 includes Issue Ledger; AI remains dark launch/off and portals are outside Wave 1. |
| `docs/launch/gap-five-area-coverage-matrix.md` | Issue and practice core coverage is partial and requires overlay admission or explicit deferral disposition. |
| `contracts/permission-kernel-contract.json` | Permission state vocabulary and fail-closed handling. |

## Flow State Mapping

| ID | Source flow step | Screen state | Required inputs | Primary action | Output state | Permission handling | Backend WP dependency |
| --- | --- | --- | --- | --- | --- | --- | --- |
| IL-FLOW-01 | Candidate discovered from document, email, meeting note, or RFI | Candidate inbox | candidate source type, source reference, short description, risk hint | triage candidate | candidate_triaged | allow: show accessible source only; denied: hide candidate and count; review_required: show review-required state without source text | LT-L2-W04 issue read model; LT-L2-W02 permission context |
| IL-FLOW-02 | Lawyer creates issue | New issue form | matter_id, title, risk, owner, source reference | create issue | open | allow: submit create; denied: disable create; review_required: allow only review request, no write-back | LT-L2-W03 issue write API; LT-L2-W04 matter runtime |
| IL-FLOW-03 | Related source is linked | Source-link panel | document/email/meeting/RFI reference, link reason | attach source | source_linked | allow: attach only accessible sources; denied: suppress source choices; review_required: hold linkage pending review | LT-L2-W03 write API; LT-L2-W02 source permission gate |
| IL-FLOW-04 | Client/counterparty position recorded | Position editor | client position, counterparty position, last updated by, evidence reference | save position | position_recorded | allow: edit permitted fields; denied: mask position text; review_required: show review-required state without text | LT-L2-W03 issue mutation; LT-L2-W05 source/QC controls |
| IL-FLOW-05 | Legal review and proposed language are drafted | Proposed language editor | legal analysis note, proposed language, source reference, reviewer | save proposal | proposal_recorded | allow: save draft proposal; denied: hide draft/proposal text; review_required: route to reviewer and block final write-back | LT-L2-W03 review path; LT-L1-W05 approval governance |
| IL-FLOW-06 | Status transitions to Need Client Input, Negotiating, etc. | Status transition menu | current status, target status, reason, next owner, due date | change status | status_changed | allow: show valid target statuses; denied: disable transition; review_required: block final transition | LT-L2-W03 state transition write path; LT-L2-W02 permission context |
| IL-FLOW-07 | Final resolution recorded | Resolution panel | resolution summary, final position, authority/source reference, closing reason | record resolution | resolved | allow: record final resolution; denied: hide resolution body; review_required: route final resolution for approval | LT-L2-W03 issue write API; LT-L1-W05 final approval rules |
| IL-FLOW-08 | Knowledge candidate created at matter closing | Knowledge candidate handoff | issue_id, resolution, approved source references, reuse tags | create candidate placeholder | knowledge_candidate_pending | allow: create non-AI placeholder only; denied: hide handoff; review_required: block candidate creation | LT-L2-W04 knowledge candidate read model; Wave 2 AI gate for interactive AI |

## Draft Issue State Enum

This enum is a UI-planning draft, not a final owner decision.

| ID | State | Meaning | Allowed next states |
| --- | --- | --- | --- |
| IL-STATE-01 | candidate_triaged | A candidate issue was reviewed but not yet accepted as an issue. | open, closed_no_action |
| IL-STATE-02 | open | An issue exists and needs source/position work. | source_linked, need_client_input, negotiating, closed_no_action |
| IL-STATE-03 | source_linked | At least one permitted source is linked. | position_recorded, need_client_input, negotiating |
| IL-STATE-04 | position_recorded | Client/counterparty position has been recorded. | legal_review, need_client_input, negotiating |
| IL-STATE-05 | legal_review | Proposed language or legal analysis is under review. | proposal_recorded, need_client_input, negotiating |
| IL-STATE-06 | proposal_recorded | Proposed language is recorded but not final. | need_client_input, negotiating, resolved |
| IL-STATE-07 | need_client_input | The next action requires client input. | position_recorded, legal_review, negotiating, resolved |
| IL-STATE-08 | negotiating | The issue is under counterparty negotiation. | need_client_input, legal_review, resolved |
| IL-STATE-09 | resolved | Final resolution is recorded. | knowledge_candidate_pending, closed |
| IL-STATE-10 | knowledge_candidate_pending | A reusable knowledge candidate placeholder exists for later review. | closed |
| IL-STATE-11 | closed_no_action | The candidate or issue was closed without resolution. | none |
| IL-STATE-12 | closed | The issue is closed for the matter. | none |

## Transition Rules

| Rule | Required behavior |
| --- | --- |
| Defined paths only | The UI exposes only target states listed in the draft enum table. Undefined transitions are hidden or disabled. |
| Reason required | Every status change requires a reason and creates an audit hint once LT-L2-W03 exists. |
| No final legal conclusion by AI | AI-discovered or AI-drafted issue content remains a non-interactive placeholder in Wave 1 and cannot become final without human review. |
| Source required for legal/proposal states | `legal_review`, `proposal_recorded`, and `resolved` require at least one accessible source reference. |
| Partial state blocked | Failed writes leave the issue in the prior state and display an error; no permanent optimistic state is allowed. |

## List and Detail Fields

| Surface | Fields |
| --- | --- |
| List row | status, risk, owner, safe source count, next action, due date, updated_at |
| Detail header | matter, title, current state, risk, owner, source summary, permission state |
| Source panel | source type, safe identifier, linkage reason, permission state, QC state if applicable |
| Position panel | client position, counterparty position, evidence reference, last updated by |
| Proposed language panel | proposed language, reviewer, source reference, review state |
| Resolution panel | final resolution, authority/source reference, close reason, knowledge candidate handoff state |

## Runtime Blockers

| Blocker | Evidence |
| --- | --- |
| Issue/practice core not fully admitted | `docs/launch/gap-five-area-coverage-matrix.md` marks R6 Issue & Practice Core as partial. |
| No Issue Ledger runtime route claimed | This IA does not create `apps/web` code, routes, or runtime handlers. |
| No issue write API claimed | Issue creation, source linking, status transitions, and resolution writes remain LT-L2-W03/LT-L2-W04 dependencies. |
| No final enum approval | The state enum is a draft until L1 scope and PRE-W04 disposition are approved. |

## Permission States

| State | Screen rule |
| --- | --- |
| allow | Render authorized issue rows, sources, positions, proposed language, and resolution fields according to matter role and source access. |
| denied | Hide inaccessible issue rows and do not leak counts, source identifiers, position text, proposed language, or resolution details. |
| review_required | Render a distinct review-required state and suppress underlying content until review is resolved. |
