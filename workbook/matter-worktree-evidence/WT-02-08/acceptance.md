# WT-02-08 acceptance

- Result: PASS (core/API tests, manual API-driver QA)
- Every idempotent Worktree mutation now requires and stores an API request ID.
- Audit events contain request ID, actor, reason, source reference, action, and object identity.
- API handlers pass trusted request IDs rather than accepting them from request bodies.
- Replaying a request with the same tenant/idempotency key creates no second state change or audit event.
- Task complete/reopen and template application use the same evidence boundary.
- Required isolated Git commit is pending because this sandbox cannot write `.git/index.lock`.

