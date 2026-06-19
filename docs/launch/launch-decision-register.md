# Launch Decision Register

Status: template_ready_no_decisions_recorded
Work package: LT-L1-W01
Created for: LT-L1-W01-T01
Recorded at: 2026-06-18T10:31:12Z

This register is the single L1 surface for human launch decisions. Codex may create and validate the register format, but must not fill a `human_decision` row as decided or deferred without real owner evidence. L1 phase entry and go-live scope approval are not claimed by this template.

## Register

| 결정ID | 제목 | owner(실명 역할) | 결정 | 근거 | 일자 | 승인 서명 | 상태 |
|---|---|---|---|---|---|---|---|

## Status Legend

Allowed status values:

| Status | Meaning | Required evidence |
|---|---|---|
| decided | The owner has made the decision and supplied the approval signature reference. | owner role, decision text, basis, date, approval signature |
| deferred(시한 명기) | The owner has explicitly deferred the decision with a target date or revisit gate. | owner role, deferral basis, target date or revisit gate, approval signature |

No other status value is permitted in the register table. Pending, blocked, draft, proposed, or agent-inferred states belong in the relevant `docs/goal-closeout/<goal_id>/command-evidence.json` record until real owner evidence exists.

## Decision ID Key Rules

| Key family | Format | Use |
|---|---|---|
| L1 scope/governance decisions | `L1-#` | L1 work-package decisions such as `L1-1` go-live scope cutoff |
| Critical open questions | `OQ-###` | Critical OQ rows from `workbook/matter_dev_docs/23_Risk_Register_Open_Questions.md` |
| PRD section 8 decisions | `PRD8-#` | PRD §8 rows such as Outlook deployment or Obsidian connector decisions |
| Go-live evidence deferrals | `ACC-GL-<gate>-<evidence>` | Exact failed G1-G10 evidence slot deferral, such as `ACC-GL-G1-G1-E02` |
| Gate-level go-live deferrals | `COVERAGE-GATE-<gate>` or `COVERAGE-ALL-GO-LIVE` | Owner-approved deferral covering all failed slots in one gate, or all go-live failed slots |
| L9 stabilization deferrals | `ACC-L9-C##` or `COVERAGE-L9-STABILIZATION` | Exact L9 closure criterion deferral, or all L9 stabilization criteria |
| Blocked WP deferrals | `WP-<wp_id>` or `COVERAGE-PHASE-<phase>` or `COVERAGE-ALL-BLOCKED-WP` | Exact blocked work package, phase-level blocked-WP group, or all blocked work packages |
| Phase-exit deferrals | `PHASE-<phase>` or `PHASE-<exit_gate>` or `COVERAGE-ALL-PHASE-EXITS` | Exact PRE-L9 phase exit, exact exit gate, or all phase exits |

The deferral coverage IDs above are accepted only when the row status is
`deferred(시한 명기)` and the row includes real owner role/name, deferral basis,
target date or revisit gate, and approval signature reference. Listing an ID
pattern here does not approve a deferral.

## Source Authority

| Source | Use |
|---|---|
| `workbook/launch-tuw/12_L1.md` | L1 work-package/TUW acceptance authority |
| `workbook/launch-tuw/00_마스터_출시피라미드_스키마_레지스트리.md` §F-3 | Escalation rule: human decisions are referred here and not completed by agents |
| `workbook/matter-post-cp-launch-plan.md` §5 L1 | Launch decision package source |

## Review Policy

Per user instruction on 2026-06-18, full Claude review is waived for future work. This waiver is recorded as `review_waived_by_user` in closeout evidence and is not valid review evidence.
