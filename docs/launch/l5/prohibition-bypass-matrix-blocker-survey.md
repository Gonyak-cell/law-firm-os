# LT-L5-W03 Prohibition Bypass Matrix Blocker Survey

Created: 2026-06-18T14:18:02Z

## Scope

LT-L5-W03 requires proof that five explicit prohibitions and eight non-goals
cannot be bypassed. The required terminal evidence is a 13-row bypass matrix
with passing evidence links for every row.

This survey records the current blocker state only. It does not close
LT-L5-W03, G3, or L5-EXIT.

## Required Prohibitions

Source: `workbook/matter_dev_docs/24_개발팀_착수_지시서.md` section 6.

| ID | Requirement | Required LT-L5-W03 evidence | Current state |
| --- | --- | --- | --- |
| P1 | No AI customer answer / DB write-back without approval | `tests/launch/security-acceptance/bypass-ai-automation/` results | Blocked: test suite absent |
| P2 | HR salary, evaluation, and hiring data not exposed through ordinary matter permission | `tests/launch/security-acceptance/bypass-hr/` results | Blocked: test suite absent |
| P3 | No SharePoint sharing link without audit | `tests/launch/security-acceptance/bypass-share-export/` results | Blocked: test suite absent |
| P4 | No Obsidian export without permission validation | `tests/launch/security-acceptance/bypass-share-export/` results | Blocked: test suite absent |
| P5 | No broad Graph permission requested by Outlook Add-in without review | `tests/launch/security-acceptance/addin-scope-check/` results | Blocked: Add-in scope check absent |

## Required Non-Goals

Source: `workbook/matter_dev_docs/01_제품_사양명세서_PRD_SRS.md` section 6.

| ID | Requirement | Required LT-L5-W03 evidence | Current state |
| --- | --- | --- | --- |
| N1 | AI legal conclusion auto-finalization prohibited | `bypass-ai-automation` route and workflow denial evidence | Blocked: test suite absent |
| N2 | Customer-send auto-transfer prohibited or separately approved | `bypass-ai-automation` route and workflow denial evidence | Blocked: test suite absent |
| N3 | Court filing auto-submit prohibited | `bypass-ai-automation` route and workflow denial evidence | Blocked: test suite absent |
| N4 | Payroll, leave, and final HR calculation by LLM prohibited | `bypass-hr` rule-engine separation evidence | Blocked: test suite absent |
| N5 | Hiring accept/reject auto-decision prohibited | `bypass-hr` route and workflow denial evidence | Blocked: test suite absent |
| N6 | Performance grade auto-assignment prohibited | `bypass-hr` route and workflow denial evidence | Blocked: test suite absent |
| N7 | Obsidian not used as source DB | `bypass-share-export` provenance and reverse-import evidence | Blocked: test suite absent |
| N8 | COM Outlook Add-in excluded; Office.js Web Add-in required | `addin-scope-check` manifest verification evidence | Blocked: Add-in scope check absent |

## Predecessor State

The following predecessor work packages remain blocked in the current launch
TUW audit:

| WP | Current command status | Classification |
| --- | --- | --- |
| LT-L2-W03 | `blocked_pending_l2_w01_w02_and_write_runtime` | `standard_five_blocked` |
| LT-L2-W05 | `blocked_pending_runtime_risk_controls_and_predecessors` | `standard_five_blocked` |
| LT-L3-W07 | `blocked_pending_m365_admin_graph_scope_entra_registration_and_admin_consent` | `standard_five_blocked` |
| LT-L3-W08 | `blocked_pending_storage_decision_m365_admin_and_sharepoint_provisioning` | `standard_five_blocked` |
| LT-L3-W09 | `blocked_pending_addin_manifest_admin_center_pilot_e2e_and_rollback_evidence` | `standard_five_blocked` |
| LT-L5-W01 | `blocked_pending_security_acceptance_harness_staging_runtime_vg_suites_run_all_and_human_signoff` | `standard_five_blocked` |
| LT-L5-W02 | `blocked_pending_ethical_wall_matrix_override_rehearsal_harness_and_runtime_controls` | `standard_five_blocked` |

## Artifact Presence

| Required artifact | Current state |
| --- | --- |
| `tests/launch/security-acceptance/bypass-ai-automation/` | Absent |
| `tests/launch/security-acceptance/bypass-hr/` | Absent |
| `tests/launch/security-acceptance/bypass-share-export/` | Absent |
| `tests/launch/security-acceptance/addin-scope-check/` | Absent |
| `docs/launch/security-acceptance/bypass-matrix.md` | Absent |
| `docs/launch/security-acceptance/addin-scope-check-report.md` | Absent |

## Manual Evidence Found

`docs/goal-closeout/lt-l7-w06/uat-scenario-catalog.md` and
`docs/goal-closeout/lt-l7-w06/prohibition-bypass-attempt-results.md` contain
future UAT scenario rows for several prohibition bypass attempts. Those rows
are marked `not_executed` and cannot substitute for LT-L5-W03 executable
security-acceptance evidence.

## Blocker Conclusion

LT-L5-W03 is blocked until:

1. The three bypass suites and Add-in scope checker are implemented and run.
2. The required predecessor runtime and Microsoft 365/Add-in decisions close.
3. The 13-row bypass matrix is assembled with valid evidence links.
4. The matrix proves 13/13 green without broken links.
5. G3 and L5-EXIT consume the evidence without treating the user review waiver
   as valid governance review.
