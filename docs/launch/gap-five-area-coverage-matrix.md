# Gap Five Area Coverage Matrix

Status: drafted_from_live_ledgers
Recorded at: 2026-06-18T10:18:00Z
Work package: LT-PRE-W04
Terminal TUW: LT-PRE-W04-T02

## Source Boundary

This matrix compares the five launch-gap areas called out in `workbook/matter-post-cp-launch-plan.md` section 4-4 against the current live plan and ledgers:

- `docs/closeout-pack-plan/closeout-pack-plan.json`
- `docs/weighted-implementation-ledger.json`
- `docs/hrx-weighted-implementation-ledger.json`
- `docs/matter-pack-integration/matter-pack-no-omission-coverage-matrix.md`
- `docs/matter-pack-integration/matter-pack-requirement-candidates.md`
- `workbook/matter_dev_docs/15_릴리스_로드맵_DBS.md`

The closeout plan currently has zero remaining planned packs. Therefore any gap area that still depends on matter-pack candidates, runtime/UI/API work, overlay admission, or owner disposition cannot be treated as closed merely because CP closeout is complete.

## Coverage Matrix

| Area | Required scope | Coverage judgment | Evidence IDs | Evidence summary | T02 disposition input |
|---|---|---|---|---|---|
| R5 Core Workflow | Task, Deadline, Work Queue, Review Queue, approval/notification workflow | partial | RP05.P02.M03; RP08.P02.M03; RP11.P02.M03; MAT-REQ-CORE-111; MAT-REQ-CORE-112; MAT-REQ-UI-102; MAT-REQ-API-106; MAT-REQ-API-107; MAT-REQ-API-206; MAT-REQ-API-207 | Base matter/task/email/time workflow anchors exist in the weighted ledger, and matter-pack candidates identify Work Queue/API/event rows. Runtime gap evidence still reports no dedicated Work Queue runtime route, so this is not covered for go-live. | yes |
| R6 Issue & Practice Core | Issue Ledger, M&A/Litigation/Corporate practice workspace, issue-authority-document-email linkage | partial | RP05.P02.M03; RP12.P02.M03; RP13.P02.M03; RP14.P02.M03; RP17.P02.M03; MAT-REQ-CORE-113; MAT-REQ-ISSUE-158; MAT-REQ-ISSUE-162; MAT-REQ-ISSUE-174; MAT-REQ-ISSUE-180; MAT-REQ-ISSUE-301; MAT-REQ-UI-105; MAT-REQ-UI-106; MAT-REQ-API-108 | Issue-related anchors and practice-pack candidates exist, including 32 practice modules and the Issue Ledger invariant. Candidate rows remain planning-only with units_currently_added 0, so overlay disposition is still required. | yes |
| R8 Obsidian | Matter Vault export/import, YAML/frontmatter, wikilinks, canvas, redaction, approval write-back | partial | RP27.P02.M03; MAT-REQ-VAULT-195; MAT-REQ-VAULT-196; MAT-REQ-VAULT-197; MAT-REQ-VAULT-198; MAT-REQ-VAULT-199; MAT-REQ-VAULT-200; MAT-REQ-VAULT-201; MAT-REQ-VAULT-202; MAT-REQ-VAULT-203; MAT-REQ-UI-111; MAT-REQ-API-111; MAT-REQ-API-112 | RP27 provides an anchor and the matter-pack extraction lists 9 Vault requirements, but the rows are new/adapt-required planning candidates and MAT-DEC-03 storage remains relevant. This is not a go-live-ready Obsidian surface. | yes |
| R10 Drafting | Drafting Workspace, Clause Library, Legal Document QC, clause provenance, issue-linked draft, human approval before final | partial | RP06.P02.M03; RP07.P02.M03; RP10.P02.M03; RP13.P02.M03; RP17.P02.M03; MAT-REQ-DRAFT-213; MAT-REQ-DRAFT-214; MAT-REQ-DRAFT-215; MAT-REQ-DRAFT-216; MAT-REQ-DRAFT-217; MAT-REQ-DRAFT-218 | Existing DMS/search/intake/AI anchors touch document and clause-related behavior, and 6 drafting candidates exist. The drafting candidates are new_required and not admitted into runtime scope; Wave 1 also keeps drafting out unless separately approved. | yes |
| R14 HR 화면군 | People/HR operations, Employee, HR documents, leave/attendance/recruitment, HR Operations UI | partial | RP30.P01.M03; RP30.P01.M04; RP30.P02.M03; MAT-REQ-HR-101; MAT-REQ-HR-103; MAT-REQ-HR-106; MAT-REQ-HR-107; MAT-REQ-HR-108; MAT-REQ-HR-111; MAT-REQ-HR-116; MAT-REQ-UI-114; MAT-REQ-API-114; MAT-REQ-API-115; MAT-REQ-API-116 | HRX/RP30 embeds HR evidence units and HR candidate rows exist, but HR runtime/go-live remains constrained by HR sensitivity, privilege/HR classification decisions, and later Launch gates. HR Operations UI is still a new_required candidate. | yes |

## T02 Disposition Input List

Every row above is `partial`, so every row is an input to LT-PRE-W04-T02. No row is currently eligible for silent closure.

| Area | T01 judgment | Required T02 disposition | Reason disposition cannot be auto-closed |
|---|---|---|---|
| T02-R5 Core Workflow | partial | overlay_admission_referral or deferred_explicit | Work Queue/Review Queue runtime and UI/API/event rows require launch-scope disposition. |
| T02-R6 Issue & Practice Core | partial | overlay_admission_referral or deferred_explicit | Issue/practice rows include new_required candidate scope and Issue Ledger invariants. |
| T02-R8 Obsidian | partial | overlay_admission_referral or deferred_explicit | Vault requirements are planning candidates and storage/origin decision remains material. |
| T02-R10 Drafting | partial | overlay_admission_referral or deferred_explicit | Drafting is new_required and outside Wave 1 unless explicitly admitted. |
| T02-R14 HR 화면군 | partial | overlay_admission_referral or deferred_explicit | HRX evidence is embedded, but HR runtime/UI needs HR-sensitive launch disposition. |

## Sample ID Existence Check

The LT-PRE-W04-T01 sample set uses ten live ledger IDs:

| ID | Source ledger | Exists |
|---|---|---|
| `RP05.P02.M03` | docs/weighted-implementation-ledger.json | yes |
| `RP08.P02.M03` | docs/weighted-implementation-ledger.json | yes |
| `RP10.P02.M03` | docs/weighted-implementation-ledger.json | yes |
| `RP11.P02.M03` | docs/weighted-implementation-ledger.json | yes |
| `RP12.P02.M03` | docs/weighted-implementation-ledger.json | yes |
| `RP13.P02.M03` | docs/weighted-implementation-ledger.json | yes |
| `RP14.P02.M03` | docs/weighted-implementation-ledger.json | yes |
| `RP17.P02.M03` | docs/weighted-implementation-ledger.json | yes |
| `RP27.P02.M03` | docs/weighted-implementation-ledger.json | yes |
| `RP30.P01.M03` | docs/hrx-weighted-implementation-ledger.json | yes |

## Non-Closure Notes

- This matrix does not add implementation units.
- This matrix does not modify CP evidence or reinterpret closed packs.
- This matrix does not decide overlay admission or explicit deferral.
- LT-PRE-W04 cannot terminally close until T02 records owner-approved disposition for every partial row.
