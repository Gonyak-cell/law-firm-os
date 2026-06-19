# Performance Acceptance Criteria Decision Brief

Status: decision_brief_blocked_pending_owner_approval_l3_w06_slo_approval_and_runtime_harness
Work package: LT-L5-W06
TUW: LT-L5-W06-T01
Prepared at: 2026-06-18
Review policy: review_waived_by_user

## Boundary

This brief is a decision input only. It does not approve performance thresholds,
does not update `docs/launch/launch-decision-register.md`, does not build a
load harness, does not create a synthetic dataset, does not run staging load
tests, and does not claim LT-L5-W06-T01 completion.

The values below are candidate thresholds for owner review. They must not be
used as pass/fail release criteria until an owner-evidenced decision exists and
the L3-W06 SLO baseline is approved or explicitly adjusted.

## Required Inputs Before Approval

| Input ID | Required input | Current state |
| --- | --- | --- |
| PERF-IN-01 | Owner-approved L3-W06 SLO threshold baseline | pending_owner_decision |
| PERF-IN-02 | Pilot roster size and expected concurrent user target | pending_LT-L1-W10_and_owner_decision |
| PERF-IN-03 | MAT-DEC-03 storage/link decision for upload measurement boundary | pending_owner_decision |
| PERF-IN-04 | Staging stack shape and telemetry capture from L3 | pending_L3_runtime_activation |
| PERF-IN-05 | Decision-register row ID/key authority for L5 performance decisions | pending_owner_or_governance_decision |

## Candidate Performance Criteria

| Criteria ID | Metric | Candidate threshold | Measurement method | Approval state |
| --- | --- | --- | --- | --- |
| PERF-CRIT-01 | Search p95 latency | <= 1000 ms p95 for authorized synthetic search requests | Scenario records request duration at API boundary and reports p95 by route/query family. | candidate_pending_owner_approval |
| PERF-CRIT-02 | Document upload p95 latency | <= 3000 ms p95 for synthetic metadata/file_ref registration path; original-file provider transfer excluded until MAT-DEC-03 | Scenario records create/register request duration and separately tags provider-transfer timing as not_measured_until_storage_decision. | candidate_pending_owner_approval_requires_slo_rationale |
| PERF-CRIT-03 | Concurrent active users | 10 simultaneous synthetic users sustained for the approved pilot load window | Scenario runs mixed Matter Home, Work Queue, search, document metadata, Outlook filing, and issue-read traffic with deterministic synthetic users. | candidate_pending_pilot_roster_approval |
| PERF-CRIT-04 | Error rate upper bound | <= 1.0% 5xx plus handled server errors across the performance window | Count scenario errors divided by total scenario requests, aligned to L3-W06 error-rate method. | candidate_pending_owner_approval |

## SLO Alignment Table

| Criteria ID | L3-W06 SLO source | Alignment state | Required owner action |
| --- | --- | --- | --- |
| PERF-CRIT-01 | SLO-DEF-02 API p95 latency candidate <= 1000 ms | aligned_to_candidate_slo | Approve or modify both values together. |
| PERF-CRIT-02 | SLO-DEF-02 API p95 latency candidate <= 1000 ms | exception_candidate_requires_rationale | Decide whether upload p95 is a separate route-family threshold and record rationale. |
| PERF-CRIT-03 | No direct L3 SLO; depends on pilot load target and stack sizing | new_performance_dimension | Approve target from pilot roster/support model before harness build. |
| PERF-CRIT-04 | SLO-DEF-03 API error rate candidate <= 1.0% | aligned_to_candidate_slo | Approve or modify both values together. |

## Candidate Load Profiles

| Profile ID | Scenario | Synthetic data needed | Primary metric | Current state |
| --- | --- | --- | --- | --- |
| LOAD-PROFILE-01 | Search/index traffic | synthetic matters, documents, emails, issue metadata, permission variants | search p95 and error rate | pending_LT-L5-W06-T02 |
| LOAD-PROFILE-02 | Document registration/upload metadata path | synthetic file_ref rows, document metadata, audit hints, permission variants | upload/register p95 and error rate | pending_MAT-DEC-03_and_LT-L5-W06-T02 |
| LOAD-PROFILE-03 | Concurrent user mixed workflow | synthetic users, matters, tasks, documents, Outlook filing metadata, issue reads | concurrent user stability and error rate | pending_pilot_target_and_LT-L5-W06-T02 |

## Decision Register Draft Input

Do not paste this into `docs/launch/launch-decision-register.md` until owner
evidence exists and the register key/row ID is approved.

| Field | Draft input |
| --- | --- |
| Proposed title | Performance acceptance criteria thresholds |
| Proposed owner | pending_owner_role |
| Proposed decision | pending_owner_approved_search_upload_concurrency_error_rate_values |
| Basis | LT-L3-W06 SLO baseline, pilot roster/load target, MAT-DEC-03 storage boundary, staging telemetry capability |
| Date | pending_owner_approval_date |
| Approval signature | pending_owner_signature_reference |
| Status | not_registerable_until_owner_evidence_exists |

## Runbook And Harness Handoff After Approval

1. Add the owner-evidenced register row with approved row ID and approval
   signature reference.
2. Convert the approved criteria into a machine-readable threshold file for
   `tests/launch/perf/scenarios/run-all.mjs`.
3. Build LT-L5-W06-T02 synthetic dataset generation around the approved pilot
   scale and storage boundary.
4. Require LT-L5-W06-T03 performance report to compare each measured value
   against the approved criteria and register P0/P1 findings for unmet launch
   blockers.
5. Preserve raw synthetic load output and summary tables in
   `docs/goal-closeout/lt-l5-w06/`.

## Open Blockers

| Blocker | Required resolution |
| --- | --- |
| Owner approval | Approve or modify the four candidate thresholds. |
| L3-W06 SLO approval | Align performance thresholds with approved SLO baseline. |
| Pilot scale | Approve concurrent user target and load window. |
| MAT-DEC-03 | Decide upload/storage boundary before measuring provider transfer. |
| L5-W06-T02 | Build synthetic dataset and load harness after thresholds are approved. |
