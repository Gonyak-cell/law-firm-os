# L2 Risk Control Realization Blocker Survey

Status: blocked_pending_runtime_risk_controls_and_predecessors

Work package: LT-L2-W05

Terminal TUW: LT-L2-W05-T07

Gate binding: G3, L2-EXIT

Review policy: review_waived_by_user

Valid review evidence: false

Recorded at: 2026-06-18T13:09:27Z

## Boundary

This survey records why LT-L2-W05 cannot close from current repo evidence. It
does not implement permission sync checker, QC gate, filing confirmation,
Ethical Wall runtime paths, emergency override, or HR guardrail runtime. It does
not satisfy G3 or L2-EXIT.

## Dependency State

| Dependency | Current audit status | Impact on W05 |
| --- | --- | --- |
| LT-PRE-W05 | `blocked_pending_mat_dec_08` / `command_evidence_only_blocked` | Confidentiality/privilege/HR-sensitive enum decision is not closed. |
| LT-L2-W02 | `blocked_pending_l0_l1_decisions_persistence_and_auth_runtime` / `standard_five_blocked` | Server-side permission context is absent. |
| LT-L2-W03 | `blocked_pending_l2_w01_w02_and_write_runtime` / `standard_five_blocked` | Write routes and non-bypassable audit are absent. |
| LT-L2-W04 | `blocked_pending_l2_w01_w02_w03_and_context_runtime` / `standard_five_blocked` | DMS, Email filing, Matter, and runtime contexts are absent. |

## Current Repo Survey

| Check | Result | Evidence |
| --- | --- | --- |
| Risk-control source files | absent | `find apps/api/src ... permission-sync/qc/filing/ethical/hr-guardrail \| wc -l` returned `0` |
| Risk-control tests | absent | `find apps/api/test ... permission-sync/qc/filing/ethical/hr-guardrail \| wc -l` returned `0` |
| Realization matrix | absent | `workbook/launch-runtime/risk-control-realization-matrix.md` is missing |
| L0 referral evidence | present | L0-W04 records RISK-003 as absent and RISK-007 as partial, both referred to L2-5 |

## TUW Blocker Matrix

| TUW | Required outcome | Current blocker | Closeout state |
| --- | --- | --- | --- |
| LT-L2-W05-T01 | Permission sync checker for RISK-003 | W02, W04 DMS, and storage/Graph decisions absent | blocked |
| LT-L2-W05-T02 | Pre-send QC gate for RISK-009 | W03 write path and W04 DMS absent | blocked |
| LT-L2-W05-T03 | Filing suggestion/confirmation/history for RISK-004 | W04 email filing runtime absent | blocked |
| LT-L2-W05-T04 | Ethical Wall blocking across five paths | W02 permission pipeline and W04 Matter runtime absent | blocked |
| LT-L2-W05-T05 | Ethical Wall emergency override | T04 absent | blocked |
| LT-L2-W05-T06 | HR guardrail schema and deterministic blocking | W02 and PRE-W05 enum/HR decision absent | blocked |
| LT-L2-W05-T07 | Risk-control realization matrix and G3 evidence | T01-T06 runtime evidence absent | blocked |

## Next Required Actions

1. Close PRE-W05 and the W02/W03/W04 runtime foundations.
2. Implement the six risk-control runtime/test surfaces in dependency order.
3. Populate the risk-control realization matrix with real test outputs.
4. Re-run the six control tests as the terminal T07 evidence bundle.
