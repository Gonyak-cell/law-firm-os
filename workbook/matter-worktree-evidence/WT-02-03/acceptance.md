# WT-02-03 acceptance

- Result: PASS (handler, tests, manual API-driver QA)
- Branch and task nodes can be created through the Worktree node API.
- Node title and sibling sort order can be patched without duplicate records.
- Every successful node mutation increments the active Worktree version once.
- The complete candidate tree is validated before the transaction.
- Task nodes can link only to a `MatterTask` in the same tenant and Matter.
- Node state, Worktree version, audit event, and idempotency receipt share one transaction.
- Canonical evidence commit: `156c35243`; the historical `.git/index.lock` wait is resolved.
