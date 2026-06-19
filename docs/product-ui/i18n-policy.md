# Product UI i18n Policy Decision Brief

Status: blocked_pending_owner_language_policy_decision
Work package: LT-L4-W05
TUW: LT-L4-W05-T01
Prepared at: 2026-06-18
Review policy: review_waived_by_user

## Boundary

This document is a decision brief only. It does not choose Korean-only or
bilingual UI policy, does not update `docs/launch/launch-decision-register.md`,
does not modify `apps/web/src/i18n.js`, and does not claim LT-L4-W05-T01
completion.

Codex cannot decide the owner language policy. The current app state is only an
input: `apps/web/src/i18n.js` contains both `ko` and `en` locale objects.

## Current i18n Source State

| Source | Observed state | Launch implication |
| --- | --- | --- |
| `apps/web/src/i18n.js` | `copy.ko` and `copy.en` are both present. | Owner must decide whether to keep bilingual structure or reduce user-visible scope. |
| Wave 1 IA set | Matter Home, Work Queue, Document Workspace, Outlook Add-in Pane, Issue Ledger, Admin Console. | Policy must cover all six Wave 1 screens. |
| Product naming rule | Product brand is `matter`; UI brand is `matter by AMIC`. | Both locales must follow the naming rule if bilingual is kept. |

## Decision Options

| Option ID | Policy option | Effect on `i18n.js` | Risks and follow-up |
| --- | --- | --- | --- |
| I18N-OPT-01 | Korean-only Wave 1 UI | Keep Korean copy as user-visible source and remove/hide English from user-visible routes. | Requires code cleanup and regression check for all visible labels. |
| I18N-OPT-02 | Korean-primary with English retained for future/admin/testing | Keep both locale objects, but make Korean the only supported pilot language. | Requires clear support/training statement and no mixed-language visible copy. |
| I18N-OPT-03 | Bilingual Wave 1 UI | Keep ko/en visible and validate both locales against glossary and product naming rules. | Requires bilingual QA, support readiness, and training material alignment. |

## Required Owner Decision Fields

| Field | Required value |
| --- | --- |
| Owner real-person role | Language/product owner or launch approver role. |
| Decision | One of I18N-OPT-01, I18N-OPT-02, or I18N-OPT-03, or an explicitly bounded alternative. |
| Basis | Pilot user language, support capacity, training scope, and UI QA capacity. |
| Date | Owner decision date. |
| Approval reference | Signature, ticket, meeting note, or equivalent approval record. |
| Register mapping | Approved decision-register key or owner-approved mapping to an existing launch decision family. |

## Decision Registration Note

The current launch decision register template allows L1, OQ, and PRD8 key
families only. Do not invent an `L4-*` decision key. Owner evidence must either
extend the register key rules or map this language policy decision to an
approved launch decision family before it can be inserted as `decided` or
timed `deferred`.

## Wave 1 Scope

| Screen ID | Screen | Policy application requirement |
| --- | --- | --- |
| I18N-SCREEN-01 | Matter Home | All area labels, empty states, permission states, and AI-off copy follow selected policy. |
| I18N-SCREEN-02 | Work Queue | Lane names, actions, denied states, and HR-exclusion copy follow selected policy. |
| I18N-SCREEN-03 | Document Workspace | Status/version/source/QC/issue labels and MAT-DEC-03 pending copy follow selected policy. |
| I18N-SCREEN-04 | Outlook Add-in Pane | Filing, attachment, Graph/storage pending, and follow-up labels follow selected policy. |
| I18N-SCREEN-05 | Issue Ledger | State, source, position, proposal, and resolution labels follow selected policy. |
| I18N-SCREEN-06 | Admin Console | User, permission, policy, audit, and disabled future-wave labels follow selected policy. |

## Blocked State

| Blocked artifact | Reason |
| --- | --- |
| `docs/product-ui/glossary.md` final UI copy contract | T02 can draft from L2-W06 but final policy alignment needs T01 decision. |
| `apps/web/src/i18n.js` cleanup | T03 code change depends on owner-selected language policy. |
| L7 bilingual or Korean-only training choice | Training publication depends on same language policy. |

## Review Policy

Per user instruction on 2026-06-18, full Claude review is waived for future
work. This waiver is recorded as `review_waived_by_user` and is not valid
review evidence.
