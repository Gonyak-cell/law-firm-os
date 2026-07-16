# WT-01-08 acceptance

Status: implementation, targeted tests, Matter regression, manual library QA, and evidence complete. Canonical evidence commit: `73bc97d68`; the historical `.git/index.lock` wait is resolved.

## Accepted implementation

- Root is projected from MatterWorktree and Matter with depth 0 and is never persisted.
- Active node depths are computed from parent relationships at read time.
- Progress is computed only from same-tenant, same-Matter `MatterTask.status`.
- Cancelled tasks are excluded from the progress denominator; done, blocked, and overdue counts are computed consistently.
- Every unlinked MatterTask, including cancelled tasks, appears exactly once in a virtual non-persisted `미분류 업무` branch.
- Linked tasks appear exactly once on their task placement.
- Foreign tenant/Matter tasks do not affect counts or serialized output.
- A placement referencing a missing MatterTask fails instead of silently omitting the task.

## Architecture review

- `worktree-projection.js` is 66 pure LOC and owns only read projection.
- Shared depth analysis remains in `worktree-structure.js`; depth and progress are not stored.
- No completion field exists outside MatterTask, and no write path or dependency was added.
