# WT-02-05 acceptance

- Result: PASS (handler, tests, manual API-driver QA)
- Dedicated complete/reopen endpoints mutate only `MatterTask.status`.
- Active writable Matter roles can complete; read-only roles receive count-safe 404.
- Reopen requires a non-empty reason and moves done to in_progress.
- Cross-Matter Task identifiers are not disclosed.
- Repeated completion returns the stored result with one audit event.
- Canonical evidence commit: `4cf9e2561`; the historical `.git/index.lock` wait is resolved.
