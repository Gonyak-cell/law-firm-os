# Training Completion Ledger

Status: template_blocked_pending_l1_w10_t02_roster_session_records_and_100_percent_completion
Work package: LT-L7-W04
TUW: LT-L7-W04-T04
Prepared at: 2026-06-18
Review policy: review_waived_by_user

## Boundary

This is a completion-ledger template and reconciliation contract only. It does
not name final pilot users, does not import a real roster, does not record
attendance, does not calculate a completion percentage, does not register
L7-EXIT evidence, and does not claim LT-L7-W04-T04 or LT-L7-W04 completion.

The final ledger must be generated from the real LT-L1-W10-T02 pilot roster and
the conducted-session evidence in `training/session-records.md`. The role-slot
pilot roster draft is not a final roster and cannot be used as a completion
population.

## Source Links

| Link ID | Target | Use |
| --- | --- | --- |
| LEDGER-SRC-01 | `training/session-records.md` | T03 session and task evidence source |
| LEDGER-SRC-02 | `training/lawyer-guide.md` | Lawyer task source |
| LEDGER-SRC-03 | `training/staff-guide.md` | Staff task source |
| LEDGER-SRC-04 | `training/admin-guide.md` | Admin task source |
| LEDGER-SRC-05 | `../../launch/pilot-roster-draft.md` | Role-slot input only; not final roster |
| LEDGER-SRC-06 | `../lt-l1-w10/command-evidence.json` | Confirms current pilot roster state is draft only |
| LEDGER-SRC-07 | `command-evidence.json` | LT-L7-W04 evidence status |

## Completion Gate Requirements

| Requirement ID | Requirement | Current state |
| --- | --- | --- |
| LEDGER-REQ-01 | Ledger population matches final LT-L1-W10-T02 roster 1:1 with no missing or extra people. | blocked_pending_final_roster |
| LEDGER-REQ-02 | Each person has role, completed session, and hands-on completion fields. | blocked_pending_session_records |
| LEDGER-REQ-03 | L7-EXIT evidence index lists this ledger after completion is proven. | not_indexed_pending_completion |

## Roster Reconciliation Contract

| Reconciliation Field ID | Required value |
| --- | --- |
| RECON-FIELD-01 | final roster source path |
| RECON-FIELD-02 | final roster approval reference |
| RECON-FIELD-03 | roster person id |
| RECON-FIELD-04 | roster role |
| RECON-FIELD-05 | ledger person id |
| RECON-FIELD-06 | ledger role |
| RECON-FIELD-07 | match status: matched, missing_from_ledger, or extra_in_ledger |
| RECON-FIELD-08 | disposition and owner/date if mismatch exists |

## Completion Ledger Field Contract

| Ledger Field ID | Required value |
| --- | --- |
| LEDGER-FIELD-01 | person id from final pilot roster |
| LEDGER-FIELD-02 | person role |
| LEDGER-FIELD-03 | required session id |
| LEDGER-FIELD-04 | attended session id |
| LEDGER-FIELD-05 | hands-on task ids completed |
| LEDGER-FIELD-06 | makeup session id if applicable |
| LEDGER-FIELD-07 | completion status: complete, incomplete, or makeup_pending |
| LEDGER-FIELD-08 | evidence reference |

## Role Completion Requirements

| Role Requirement ID | Role | Required evidence |
| --- | --- | --- |
| LEDGER-ROLE-01 | lawyer | Attendance at lawyer session plus four lawyer task completions. |
| LEDGER-ROLE-02 | staff | Attendance at staff session plus two staff task completions. |
| LEDGER-ROLE-03 | admin | Attendance at admin session plus three admin task completions. |

## Current Ledger Metrics

| Metric ID | Metric | Current value |
| --- | --- | --- |
| LEDGER-METRIC-01 | Final roster rows available | 0 |
| LEDGER-METRIC-02 | Completion ledger person rows recorded | 0 |
| LEDGER-METRIC-03 | Conducted session records available | 0 |
| LEDGER-METRIC-04 | Completion percentage | not_available_pending_roster_and_sessions |
| LEDGER-METRIC-05 | Missing roster-to-ledger matches | not_available_pending_roster |
| LEDGER-METRIC-06 | Extra ledger rows | 0 |
| LEDGER-METRIC-07 | L7-EXIT evidence index registration | not_indexed |

## Future L7-EXIT Evidence Index Slot

| Index Slot ID | Evidence item | Required before close | Current state |
| --- | --- | --- | --- |
| L7-IDX-TRAIN-01 | Role guides and quick references | Final link and screen validation after L4-W06 | draft_only |
| L7-IDX-TRAIN-02 | Session records | Three role sessions and attendee task matrix | pending_sessions |
| L7-IDX-TRAIN-03 | Training completion ledger | 100 percent completion and roster reconciliation | pending_roster_and_sessions |

## Closeout Rules

1. Do not compute completion percentage from role-slot rows.
2. Do not mark absent users complete without makeup-session evidence.
3. Do not register this ledger in L7-EXIT until roster reconciliation and task
   completion are proven.
4. Do not use real names in drafts before the approved roster artifact exists.
5. Do not treat `review_waived_by_user` as training acceptance or review
   evidence.

## Open Blockers

| Blocker | Required resolution |
| --- | --- |
| LT-L1-W10-T02 | Final pilot roster with real people, owner, and time allocation. |
| LT-L7-W04-T03 | Conducted sessions with attendance, hands-on completion matrix, FAQ handoff, and makeup disposition. |
| L7-EXIT evidence index | Final index update after completion is proven. |
