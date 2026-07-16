# WT-01-10 acceptance

- Result: PASS (source, automated tests, manual library QA)
- Same tenant/idempotency key executes the mutation once and replays the stored response.
- State mutation, one audit event, and one idempotency receipt share one repository transaction.
- Audit evidence records actor, reason, source reference, object type/id, operation, and occurrence time.
- Missing mutation evidence is rejected before the write callback runs.
- Mutation failure rolls back state, audit, and idempotency records.
- MatterTask complete and approved synthetic template application use the common mutation boundary.
- `MatterTask.status` remains the sole completion source.
- Canonical evidence commit: `cd963ee67`; the historical `.git/index.lock` wait is resolved.
