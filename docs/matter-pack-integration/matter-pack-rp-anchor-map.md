# Matter-Pack RP Anchor Map (A-5)

Status: planning-only. Live cursor at execution start: CP00-326 / RP10.P04.M04.S18. Closed packs remain historical-only.

## Anchor Rules

- Existing-covered items receive trace anchors only.
- New items are future overlays or approved ledger-extension candidates.
- Adapt/conflict items carry MAT-DEC references and cannot be silently absorbed.
- Closed pack direct insertion count: 0.

## Three-Class Anchor Table

| class | families | primary RP | first CP policy | notes |
| --- | --- | --- | --- | --- |
| existing trace | CORE/PERM/DMS/AUDIT | RP01/RP02/RP03/RP05/RP08 | trace only | covered_but_requires_trace rows keep existing implementations |
| new overlay | ISSUE/PORTAL/VAULT/AIGW/DRAFT/BILL/HR/UI/API | RP11-RP30 | future overlay or approval ledger extension | Workflow/Issue/Obsidian/HR isolated as expansion candidates |
| adapt + decision | GOV/CORE/M365/HR/AIGW | RP00/RP06/RP08/RP17/RP19/RP30 | blocked until MAT-DEC or C-review | P0/P1 items have primary RP or expansion candidate |

## First-Use Entry Points

| entry | decision/gate | status | landing policy |
| --- | --- | --- | --- |
| RP10 remaining Party conflict_status | none | trace now | Do not alter closed RP10 packs; future trace only |
| RP11 Time/Billing | MAT-DEC-02 | decided_2026-06-11_employee_user_id | Employee.user_id reverse link accepted |
| RP06/RP08 runtime storage | MAT-DEC-03 | deferred | storage-dependent rows sealed |
| RP17/RP18 AIGW | MAT-DEC-07/axis5 | decided runtime vocabulary | AIGW remains separate from dev_ai_control |
| RP19/RP20 Portal | MAT-DEC-01 | decided first tenant | Portal remains projection-only and multi-tenant capable |
| RP27 Obsidian | V2 CP00-814 map | mapped | Use docs/spec-v2-integration/v2-rp-anchor-map.md |
| RP30 HRX | MAT-DEC-06 | decided | HRX embedded People/HR Evidence source ledger |

## Unanchored Expansion Candidates

Workflow, Issue, Obsidian Vault, and HR rows that are not covered by existing RP source ledgers are isolated as approved-ledger-extension candidates. No current unit is added by this map.
