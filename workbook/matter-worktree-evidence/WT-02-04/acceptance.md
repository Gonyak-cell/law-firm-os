# WT-02-04 acceptance

- Result: PASS (handler, tests, manual API-driver QA)
- Parent changes use full-tree validation and reject moves beneath descendants.
- DELETE archives the selected node and all descendants in one transaction.
- Archived task placement never deletes or changes the linked `MatterTask`.
- Subtree archive increments Worktree version once and writes one audit/idempotency pair.
- Required isolated Git commit is pending because this sandbox cannot write `.git/index.lock`.

