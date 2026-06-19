# KPI Target Decision Brief

Status: decision_brief_blocked_pending_owner_approval_and_l9_2_baseline_policy
Work package: LT-L6-W06
TUW: LT-L6-W06-T02
Prepared at: 2026-06-18
Review policy: review_waived_by_user

## Boundary

This brief is a decision input only. It does not set KPI targets, does not
update `docs/launch/launch-decision-register.md`, does not implement collection,
does not publish a KPI dashboard, and does not claim LT-L6-W06-T02 completion.

The owner may either approve numeric targets now or explicitly defer target
setting to the L9-2 four-week baseline report. Codex must not choose either
path without owner evidence.

## Required Inputs Before Approval

| Input ID | Required input | Current state |
| --- | --- | --- |
| KPI-TARGET-IN-01 | Owner decision: numeric target now or L9-2 baseline deferral | pending_owner_decision |
| KPI-TARGET-IN-02 | Approved target units matching LT-L6-W06-T01 formulas | pending_owner_decision |
| KPI-TARGET-IN-03 | L2-W03 runtime event/write paths for automated collection | pending_runtime_implementation |
| KPI-TARGET-IN-04 | L3-W06 monitoring/SLO stack and operations dashboard policy | pending_stack_decision_and_activation |
| KPI-TARGET-IN-05 | Register row ID/key authority for L6 KPI target decisions | pending_owner_or_governance_decision |

## KPI Target Decision Matrix

| Target ID | KPI ID | Metric unit from T01 | Owner decision choices | L9-2 baseline linkage | Current state |
| --- | --- | --- | --- | --- | --- |
| KPI-TARGET-01 | KPI-DEF-01 Matter status visibility | percent of required Matter Home signals visible | approve numeric percent target now; or defer until L9-2 baseline | 4-week Matter Home signal baseline | pending_owner_decision |
| KPI-TARGET-02 | KPI-DEF-02 Filing usage rate | percent of eligible Outlook emails filed | approve numeric percent target now; or defer until L9-2 baseline | 4-week eligible/filed email baseline | pending_owner_decision |
| KPI-TARGET-03 | KPI-DEF-03 Document integrity | percent of QC findings fixed before final/send | approve numeric percent target now; or defer until L9-2 baseline | 4-week QC finding/fix baseline | pending_owner_decision |
| KPI-TARGET-04 | KPI-DEF-04 AI reliability | source-linked AI output percent plus hallucination incident count | keep Wave 1 zero-output check and defer target until Wave 2 gate; or approve post-gate target | L9-2 AI off-state baseline, then Wave 2 gate baseline if opened | pending_owner_decision |
| KPI-TARGET-05 | KPI-DEF-05 Security | unauthorized attempts blocked percent and audit completeness percent | approve strict target now; or defer threshold while requiring no known leakage | 4-week denial/audit completeness baseline | pending_owner_decision |
| KPI-TARGET-06 | KPI-DEF-06 HR stability | HR sensitive attempts blocked percent and deterministic/AI separation pass percent | defer until HR gates and synthetic checks pass; or approve synthetic-only target | L9-2 synthetic HR guard baseline; real HR data remains gated | pending_owner_decision |
| KPI-TARGET-07 | KPI-DEF-07 Knowledge conversion | percent of closed matters producing Knowledge Pack/candidate | approve monthly target now; or defer until closed-matter baseline exists | 4-week closed matter/knowledge candidate baseline | pending_owner_decision |

## Unit Alignment Check

| Alignment ID | KPI ID | T01 unit | Target decision unit | Alignment state |
| --- | --- | --- | --- | --- |
| KPI-UNIT-01 | KPI-DEF-01 | percent | percent | aligned_pending_value |
| KPI-UNIT-02 | KPI-DEF-02 | percent | percent | aligned_pending_value |
| KPI-UNIT-03 | KPI-DEF-03 | percent | percent | aligned_pending_value |
| KPI-UNIT-04 | KPI-DEF-04 | percent plus incident count | percent plus incident count | aligned_pending_value |
| KPI-UNIT-05 | KPI-DEF-05 | percent plus audit completeness percent | percent plus audit completeness percent | aligned_pending_value |
| KPI-UNIT-06 | KPI-DEF-06 | percent plus pass percent | percent plus pass percent | aligned_pending_value |
| KPI-UNIT-07 | KPI-DEF-07 | percent | percent | aligned_pending_value |

## L9-2 Baseline Deferral Contract

If the owner defers any target to L9-2, the deferral must be explicit and must
identify the baseline evidence required before final target setting.

| Baseline ID | KPI ID | Baseline evidence required | Deferral state |
| --- | --- | --- | --- |
| KPI-BASE-01 | KPI-DEF-01 | 4 weeks of Matter Home signal visibility measurements | available_if_owner_defers |
| KPI-BASE-02 | KPI-DEF-02 | 4 weeks of eligible and filed Outlook email counts | available_if_owner_defers |
| KPI-BASE-03 | KPI-DEF-03 | 4 weeks of QC finding and fix outcomes | available_if_owner_defers |
| KPI-BASE-04 | KPI-DEF-04 | Wave 1 AI zero-output record, then Wave 2 baseline if AI opens | available_if_owner_defers |
| KPI-BASE-05 | KPI-DEF-05 | 4 weeks of unauthorized-attempt and audit-completeness counts | available_if_owner_defers |
| KPI-BASE-06 | KPI-DEF-06 | Synthetic HR guard baseline; real HR baseline only after HR gates | available_if_owner_defers |
| KPI-BASE-07 | KPI-DEF-07 | 4 weeks of closed-matter and knowledge candidate counts | available_if_owner_defers |

## Decision Register Draft Input

Do not paste this into `docs/launch/launch-decision-register.md` until owner
evidence exists and the register key/row ID is approved.

| Field | Draft input |
| --- | --- |
| Proposed title | KPI target values or L9-2 baseline deferrals |
| Proposed owner | pending_owner_role |
| Proposed decision | pending_owner_approved_targets_or_baseline_deferrals_for_KPI_DEF_01_through_07 |
| Basis | LT-L6-W06-T01 KPI formulas, L9-2 baseline plan, L2/L3 runtime availability |
| Date | pending_owner_approval_date |
| Approval signature | pending_owner_signature_reference |
| Status | not_registerable_until_owner_evidence_exists |

## Open Blockers

| Blocker | Required resolution |
| --- | --- |
| Owner decision | Approve numeric targets or explicit L9-2 baseline deferrals for all 7 KPIs. |
| Register row authority | Approve how L6 KPI target decisions are represented in the launch decision register. |
| Runtime collection | L2/L3/L6 collection paths must exist before automated measurement. |
| L9-2 baseline | Deferred targets require four-week baseline evidence before final target comparison. |
