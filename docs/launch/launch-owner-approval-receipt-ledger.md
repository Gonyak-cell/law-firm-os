# Launch Owner Approval Receipt Ledger

Generated at: 2026-06-18T23:55:54.074Z

## Boundary

- This ledger is a receipt intake template only.
- It does not approve go-live.
- It does not approve owner deferrals.
- It does not modify `docs/launch/launch-decision-register.md`.
- Pending receipt slots do not count as owner evidence.
- Existing receipt fields are preserved by decision ID during regeneration.
- Full Claude review remains waived and is not valid review evidence.
- Closed CP evidence remains read-only.

## Summary

- receipt_slot_count: 4
- pending_receipt_slot_count: 4
- real_owner_receipt_count: 0
- copy_allowed_count: 0
- target_count_if_all_receipts_are_completed: 115

## Required Receipt Fields

`owner`, `decision`, `basis`, `date_or_revisit_gate`, `approval_signature_ref`, `received_at`, `recorded_by_human`

## Receipt Slots

| Decision ID | Domain | Targets | Receipt status | Target detail state |
| --- | --- | ---: | --- | --- |
| COVERAGE-ALL-GO-LIVE | go_live_gate_evidence | 29 | pending_owner_evidence | all_targets_matched_and_aggregate_accepted |
| COVERAGE-L9-STABILIZATION | l9_stabilization_closure | 5 | pending_owner_evidence | all_targets_matched_and_aggregate_accepted |
| COVERAGE-ALL-BLOCKED-WP | blocked_work_package | 70 | pending_owner_evidence | all_targets_matched_and_aggregate_accepted |
| COVERAGE-ALL-PHASE-EXITS | phase_exit | 11 | pending_owner_evidence | all_targets_matched_and_aggregate_accepted |

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

## Register Copy Rule

Only after a receipt slot is replaced with real owner evidence may the matching decision row be copied into the launch decision register. This receipt ledger is not itself a launch decision.
