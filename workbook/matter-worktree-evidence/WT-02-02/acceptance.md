# WT-02-02 acceptance

- Result: PASS (handler, tests, manual API-driver QA)
- `POST /api/matters/:matter_id/worktree` creates one empty active Worktree with audit and idempotency evidence.
- A second active Worktree for the same tenant/Matter returns 409 and leaves one record.
- `POST /api/matters/:matter_id/worktree/template-applications` applies only approved templates.
- Template replay returns 200 without duplicating Worktree, nodes, tasks, or audit.
- Draft template rejection leaves no partial state or audit event.
- Writes require explicit route permission, matching tenant, permission envelope, and an active edit-capable Matter member.
- Canonical evidence commit: `7d4982797`; the historical `.git/index.lock` wait is resolved.
