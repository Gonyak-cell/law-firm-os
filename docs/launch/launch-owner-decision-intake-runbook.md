# Launch Owner Decision Intake Runbook

Generated at: 2026-06-18T17:19:14.851Z

## Boundary

- This runbook is an intake guide only.
- It does not approve go-live.
- It does not approve owner deferrals.
- It does not modify `docs/launch/launch-decision-register.md`.
- It cannot count placeholder rows as owner evidence.
- Full Claude review remains waived and is not valid review evidence.
- Closed CP evidence remains read-only.

## Current State

- decision_register_total_rows: 0
- owner_evidence_quality_pass_count: 0
- minimum_owner_row_count: 4
- target_count_if_minimum_owner_rows_are_completed: 117
- valid_applied_minimum_decision_row_count: 0
- remaining_target_count_after_valid_applied_rows: 117
- intake_batch_count: 8
- owner_input_required_count: 117

## Required Register Fields

`decision_id`, `title`, `owner`, `decision`, `basis`, `date_or_revisit_gate`, `approval_signature`, `status`

## Minimum Owner Rows

| Decision ID | Domain | Targets | Required owner basis | Register status after real owner evidence |
| --- | --- | ---: | --- | --- |
| COVERAGE-ALL-GO-LIVE | go_live_gate_evidence | 31 | Owner accepts deferring all currently failed go-live gate evidence slots. | deferred(시한 명기) |
| COVERAGE-L9-STABILIZATION | l9_stabilization_closure | 5 | Owner accepts deferring all currently blocked L9 stabilization closure criteria. | deferred(시한 명기) |
| COVERAGE-ALL-BLOCKED-WP | blocked_work_package | 70 | Owner accepts deferring all currently blocked PRE-L9 launch work packages. | deferred(시한 명기) |
| COVERAGE-ALL-PHASE-EXITS | phase_exit | 11 | Owner accepts deferring all currently blocked PRE-L9 phase exits. | deferred(시한 명기) |

## Signature Reference Formats

| Format | Rule |
| --- | --- |
| docs/<local-evidence-path> | Local signature or approval reference must resolve in the repository. |
| external:<system-and-record-id> | External approval reference must identify the source system and record. |
| signature:<signature-record-id> | Signature reference must identify the signed record. |
| approval:<approval-record-id> | Approval reference must identify the approval record. |
| email:<message-id-or-thread-ref> | Email reference must identify the approving message or thread. |
| ticket:<ticket-id> | Ticket reference must identify the approval ticket. |
| meeting:<meeting-id-or-minutes-ref> | Meeting reference must identify the minutes or decision record. |

## Intake Batches

| Batch | Lane | Targets | Required action |
| --- | --- | ---: | --- |
| B01 | external_dependency | 10 | Collect external legal, M365, identity, pilot, or third-party evidence, or obtain a real owner-approved deferral. |
| B02 | owner_decision_signature | 27 | Record real owner decisions, signatures, acceptance, ratification, or explicit owner-approved deferrals. |
| B03 | policy_scope_decision | 3 | Resolve policy/scope choices, or obtain owner-approved deferrals with basis and revisit gates. |
| B04 | runtime_operational_evidence | 24 | Provide real runtime, staging, monitoring, rollback, DR, pilot, or operational evidence, or defer with owner approval. |
| B05 | evidence_completion | 6 | Fill missing evidence cells, links, records, and acceptance artifacts, or defer with owner approval. |
| B06 | go_live_gate_evidence | 31 | Supply failed go-live gate evidence slots, or record coverage-eligible owner-approved deferrals. |
| B07 | phase_exit_closure_or_deferral | 11 | Close phase exits through real WP evidence, or record phase-exit owner-approved deferrals. |
| B08 | l9_stabilization_measurement | 5 | Provide measured L9 stabilization/hypercare evidence, or record owner-approved deferrals. |

## Validation Sequence

| Step | Command |
| ---: | --- |
| 1 | `node scripts/validate-launch-decision-register.mjs` |
| 2 | `node scripts/audit-launch-decision-register-owner-evidence.mjs` |
| 3 | `node scripts/audit-launch-minimum-deferral-application.mjs` |
| 4 | `node scripts/audit-launch-deferral-coverage.mjs` |
| 5 | `node scripts/audit-launch-goal-completion.mjs` |
| 6 | `node scripts/audit-launch-no-go-claim-policy.mjs` |

## Copy Rule

Copy a minimum row into the launch decision register only after the owner, decision, basis, date or revisit gate, and approval signature fields contain real evidence. This runbook is not itself a launch decision.
