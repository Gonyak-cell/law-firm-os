# LT-L2-W06-T01 Matter Status Canonical Map Draft

Status: blocked_pending_human_canonical_status_decision
Work package: LT-L2-W06
TUW: LT-L2-W06-T01
Prepared at: 2026-06-18
Review policy: review_waived_by_user

## Purpose

This draft inventories the three conflicting Matter status sources and proposes
a canonical mapping for owner decision. It does not update
`docs/launch/launch-decision-register.md`, does not change code, and does not claim a decided canonical state machine.

## Source Inventory

### Document 05 Matter State

Source: `workbook/matter_dev_docs/05_도메인_객체_데이터모델.md` §3.

| Row | Source value | Normalized candidate | Proposed canonical bucket | Notes |
| --- | --- | --- | --- | --- |
| DOC05-01 | Lead | lead | intake | Pre-engagement candidate matter. |
| DOC05-02 | Conflict Check | conflict_check | opening | Conflict clearance before engagement. |
| DOC05-03 | Proposal | proposal | opening | Proposal/retainer setup before open matter. |
| DOC05-04 | Engagement | engagement | opening | Engagement formalization before active work. |
| DOC05-05 | Open | open | open | Matter is open. |
| DOC05-06 | Active | active | open | Active work is a substate of open unless owner decides otherwise. |
| DOC05-07 | Pending Client / Pending Counterparty | pending_external | paused | External dependency wait state. |
| DOC05-08 | Signing | signing | closing | Closing-phase execution step. |
| DOC05-09 | Closing | closing | closing | Closing-phase state. |
| DOC05-10 | Post-closing | post_closing | closed | Post-closing obligations after main closing; may need substate. |
| DOC05-11 | Archived | archived | archived | Archived matter. |

### packages/matter Lifecycle Statuses

Source: `packages/matter/src/registry.js` `MATTER_LIFECYCLE_STATUSES`.

| Row | Source value | Proposed canonical bucket | Notes |
| --- | --- | --- | --- |
| MATTER-REG-01 | intake | intake | Already aligned candidate. |
| MATTER-REG-02 | opening | opening | Covers conflict/proposal/engagement setup. |
| MATTER-REG-03 | open | open | Covers open/active. |
| MATTER-REG-04 | paused | paused | Covers external dependency wait state. |
| MATTER-REG-05 | closing | closing | Covers signing/closing. |
| MATTER-REG-06 | closed | closed | Covers post-closing unless separate substate is approved. |
| MATTER-REG-07 | archived | archived | Already aligned candidate. |

### packages/domain Matter Statuses

Source: `packages/domain/src/entities.js` `MATTER_STATUSES`.

| Row | Source value | Proposed canonical bucket | Gap |
| --- | --- | --- | --- |
| DOMAIN-01 | intake | intake | no gap |
| DOMAIN-02 | open | open | lacks opening |
| DOMAIN-03 | paused | paused | no gap |
| DOMAIN-04 | closed | closed | lacks closing |
| DOMAIN-05 | archived | archived | no gap |

## Proposed Canonical State Machine

Proposal status: proposal_only_pending_owner_decision

| Order | Canonical status | Entered from | Exits to | Rationale |
| ---: | --- | --- | --- | --- |
| 1 | intake | new lead or intake request | opening, archived | Keeps pre-conflict lead material out of open matter state. |
| 2 | opening | conflict/proposal/engagement setup | open, archived | Preserves `packages/matter` granularity absent from `packages/domain`. |
| 3 | open | engagement complete | paused, closing, archived | Main active work bucket. |
| 4 | paused | external wait or temporary hold | open, closing, archived | Captures client/counterparty pending state without multiplying statuses. |
| 5 | closing | signing and closing work | closed, open | Preserves `packages/matter` closing state absent from `packages/domain`. |
| 6 | closed | matter completed or post-closing obligations remain | archived, open | Post-closing may be a substate or tag until owner decides. |
| 7 | archived | retention/archive action | none or reopen by controlled procedure | Terminal archival state. |

## Task Status Disposition Draft

Task status is not a Matter lifecycle status and should stay in a separate
`MATTER_TASK_STATUSES` track. Current `packages/matter` task statuses are
`todo`, `in_progress`, `blocked`, `done`, and `cancelled`; document 05 adds
`Candidate`, `In Review`, and `Archived` concepts. Proposed disposition for the
human decision:

| Task concept | Proposed disposition |
| --- | --- |
| Candidate | Treat as task intake/backlog candidate, not a Matter status. Requires explicit add or mapping to `todo`. |
| In Review | Treat as a task workflow state, not a Matter status. Requires explicit add or mapping to `blocked`/`in_progress` with review flag. |
| Archived | Treat as retention/archive marker, not an active task workflow state. Requires separate archival metadata or status add. |

## Decision Required

The owner must decide whether to adopt the 7-state canonical machine above,
choose a smaller `packages/domain` 5-state model, or preserve document 05's
finer-grained statuses as a separate stage/substage model. Until that decision
is recorded in the launch decision register, `LT-L2-W06-T01` remains
`blocked_pending_human_canonical_status_decision`.
