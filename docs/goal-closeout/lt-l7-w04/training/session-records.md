# Role-Based Training Session Records

Status: template_blocked_pending_l1_w10_t02_pilot_roster_handson_runtime_and_actual_sessions
Work package: LT-L7-W04
TUW: LT-L7-W04-T03
Prepared at: 2026-06-18
Review policy: review_waived_by_user

## Boundary

This is a session-record template and readiness ledger only. It does not
schedule a session, conduct training, name attendees, record attendance,
complete hands-on tasks, create FAQ candidates, or claim LT-L7-W04-T03 or
LT-L7-W04 completion.

Actual session records require a real LT-L1-W10-T02 pilot roster, the
LT-L7-W04-T02 hands-on environment, and role-based sessions conducted with
attendees. Until then, all session rows below remain planned and not conducted.

## Source Links

| Link ID | Target | Use |
| --- | --- | --- |
| SESSION-SRC-01 | `../../../launch/pilot-roster-draft.md` | Role-slot input only; not a real roster |
| SESSION-SRC-02 | `../../lt-l1-w10/command-evidence.json` | Confirms LT-L1-W10-T01 is draft only |
| SESSION-SRC-03 | `handson-environment.md` | Hands-on environment prerequisite |
| SESSION-SRC-04 | `lawyer-guide.md` | Lawyer session material |
| SESSION-SRC-05 | `staff-guide.md` | Staff session material |
| SESSION-SRC-06 | `admin-guide.md` | Admin session material |
| SESSION-SRC-07 | `../../../launch/support/faq-onboarding.md` | FAQ/support handoff |
| SESSION-SRC-08 | `../../../launch/runbooks/incident-response-runbook.md` | Incident escalation route |

## Prerequisite State

| Prerequisite ID | Requirement | Current state | Close impact |
| --- | --- | --- | --- |
| SESSION-PREREQ-01 | LT-L7-W04-T01 role guides and quick references | draft artifacts exist, not closed | usable as draft input only |
| SESSION-PREREQ-02 | LT-L7-W04-T02 hands-on environment | specification exists, no runtime evidence | sessions cannot be conducted |
| SESSION-PREREQ-03 | LT-L1-W10-T02 real pilot roster | pending human nomination and time allocation | attendees cannot be named |
| SESSION-PREREQ-04 | EXT-PILOT-TEAM time commitment | pending external team availability | schedule cannot be confirmed |

## Planned Session Ledger

| Session ID | Role | Material | Required minimum | Planned facilitator | Current state |
| --- | --- | --- | --- | --- | --- |
| SESSION-PLAN-01 | lawyer | `lawyer-guide.md` and `quick-reference-lawyer.md` | 1 conducted session | pending_named_facilitator | not_scheduled_not_conducted |
| SESSION-PLAN-02 | staff | `staff-guide.md` and `quick-reference-staff.md` | 1 conducted session | pending_named_facilitator | not_scheduled_not_conducted |
| SESSION-PLAN-03 | admin | `admin-guide.md` and `quick-reference-admin.md` | 1 conducted session | pending_named_facilitator | not_scheduled_not_conducted |

## Required Session Record Fields

Each conducted session must produce all fields below before T03 can close.

| Field ID | Required field | Rule |
| --- | --- | --- |
| SESSION-FIELD-01 | session id | Stable id mapped to role and date |
| SESSION-FIELD-02 | session date and time | Actual timestamp, not planned placeholder |
| SESSION-FIELD-03 | facilitator | Named person or approved role after owner assignment |
| SESSION-FIELD-04 | attendee list | Real pilot roster members only |
| SESSION-FIELD-05 | material version | Guide and quick reference path or commit |
| SESSION-FIELD-06 | environment/build id | Staging build and seed/reset identifier |
| SESSION-FIELD-07 | hands-on task matrix | Per attendee, per task, completed or makeup required |
| SESSION-FIELD-08 | questions and issues | Safe-content notes and FAQ candidate classification |
| SESSION-FIELD-09 | absence/makeup plan | Required if any roster member is absent; otherwise explicit none |

## Attendee Matrix Template

No attendee rows are recorded yet. The final matrix must be derived from the
real LT-L1-W10-T02 roster, not from the role-slot draft.

| Matrix Field ID | Required value |
| --- | --- |
| ATTENDANCE-FIELD-01 | attendee id from final pilot roster |
| ATTENDANCE-FIELD-02 | attendee role |
| ATTENDANCE-FIELD-03 | assigned session id |
| ATTENDANCE-FIELD-04 | attended yes/no |
| ATTENDANCE-FIELD-05 | hands-on completion yes/no |
| ATTENDANCE-FIELD-06 | makeup required yes/no |
| ATTENDANCE-FIELD-07 | evidence reference |

## Hands-On Task Matrix

| Task ID | Role | Task | Completion source |
| --- | --- | --- | --- |
| TASK-LAWYER-01 | lawyer | Matter Home review | `lawyer-guide.md` TRAIN-LAWYER-MODULE-01 |
| TASK-LAWYER-02 | lawyer | Work Queue review and approval handling | `lawyer-guide.md` TRAIN-LAWYER-MODULE-02 |
| TASK-LAWYER-03 | lawyer | Filing confirmation and misfiling preservation | `lawyer-guide.md` TRAIN-LAWYER-MODULE-03 |
| TASK-LAWYER-04 | lawyer | Issue Ledger triage and source-based resolution | `lawyer-guide.md` TRAIN-LAWYER-MODULE-04 |
| TASK-STAFF-01 | staff | Document Workspace metadata and `file_ref` opacity check | `staff-guide.md` TRAIN-STAFF-MODULE-01 |
| TASK-STAFF-02 | staff | Filing support and misfiling escalation | `staff-guide.md` TRAIN-STAFF-MODULE-02 |
| TASK-ADMIN-01 | admin | Admin Console read surfaces | `admin-guide.md` TRAIN-ADMIN-MODULE-01 |
| TASK-ADMIN-02 | admin | Permission route and denied/review_required behavior | `admin-guide.md` TRAIN-ADMIN-MODULE-02 |
| TASK-ADMIN-03 | admin | Audit field and evidence preservation | `admin-guide.md` TRAIN-ADMIN-MODULE-03 |

## Questions, Issues, And FAQ Handoff Template

| FAQ Field ID | Required value |
| --- | --- |
| FAQ-FIELD-01 | question or issue id |
| FAQ-FIELD-02 | source session id |
| FAQ-FIELD-03 | reporter role |
| FAQ-FIELD-04 | safe description without privileged content |
| FAQ-FIELD-05 | classification: FAQ, support, incident, permission, change, training, or backlog |
| FAQ-FIELD-06 | route reference |
| FAQ-FIELD-07 | owner role or pending owner |
| FAQ-FIELD-08 | handoff status |

## Absence And Makeup Plan Template

| Makeup Field ID | Required value |
| --- | --- |
| MAKEUP-FIELD-01 | absent attendee id |
| MAKEUP-FIELD-02 | missed session id |
| MAKEUP-FIELD-03 | reason category if safely recordable |
| MAKEUP-FIELD-04 | makeup date/time |
| MAKEUP-FIELD-05 | facilitator |
| MAKEUP-FIELD-06 | completion evidence reference |

## Current Evidence State

| Evidence ID | Criterion | Current value |
| --- | --- | --- |
| SESSION-EVIDENCE-01 | Conducted role sessions | 0 of required 3 |
| SESSION-EVIDENCE-02 | Attendee task completion rate | not_available_pending_sessions |
| SESSION-EVIDENCE-03 | FAQ candidates handed to L6 support | 0 |
| SESSION-EVIDENCE-04 | Absence/makeup plan | not_available_pending_roster_and_sessions |

## Open Blockers

| Blocker | Required resolution |
| --- | --- |
| LT-L1-W10-T02 | Real pilot roster, owner, and time allocation must be approved. |
| LT-L7-W04-T02 | Hands-on environment must be executable with synthetic accounts and seed data. |
| EXT-PILOT-TEAM | Pilot team availability must be scheduled. |
| L6 support handoff | FAQ/support route must be ready to accept session questions. |
