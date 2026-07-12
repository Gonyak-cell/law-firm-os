# WT-00-04 acceptance

Status: implementation, contract test, package regression, and evidence complete. Canonical evidence commit: `9bb32a4de`; the historical `.git/index.lock` wait is resolved.

## Accepted fixture

- Eight deterministic synthetic Matters exist in one dedicated QA tenant.
- Litigation, corporate advisory, dispute, and transaction each have exactly two Matters.
- Every Matter has three existing `MatterTask` records, for 24 tasks total.
- Every practice area contains at least one blocked task and one overdue, non-completed task.
- Expected projection lists all 24 task IDs exactly once, so the fixture baseline has zero task omissions.
- Practice-area classification resolves all eight Matters with zero misclassifications.
- Completion remains exclusively in `MatterTask.status`; no duplicate completion fields exist.
- Fixture titles are visibly marked `[QA]` and contain no production client data.

This fixture is specification and test data only. It does not write records into a running tenant.
