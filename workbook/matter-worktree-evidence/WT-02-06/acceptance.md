# WT-02-06 acceptance

- Result: PASS (shared authorization boundary, tests, manual library QA)
- All Worktree routes require matching principal tenant and, for writes, matching actor ID.
- Active Matter membership, an allowed action role, and the exact Matter permission envelope are mandatory.
- Read, structure edit, and Task transitions use distinct role sets from the frozen contract.
- Cross-tenant, forged-actor, envelope-mismatch, and role-denied requests return count-safe 404 without writes.
- Paralegal read/Task access remains allowed while structure edits remain denied.
- Required isolated Git commit is pending because this sandbox cannot write `.git/index.lock`.

