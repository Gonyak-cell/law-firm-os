# WT-01-05 acceptance

Status: implementation, targeted tests, Matter regression, manual library QA, and evidence complete. Canonical evidence commit: `cf46eee72`; the historical `.git/index.lock` wait is resolved.

## Accepted implementation

- Active Worktree nodes are validated as one acyclic tree/forest below the projected root.
- Active nodes reject missing or archived parents and reject task nodes as parents.
- Self-parenting and ancestor-to-descendant moves fail with `WORKTREE_CYCLE`.
- Computed depth starts at 1 below the projected root and rejects depth greater than 4.
- Sort order must be a non-negative integer and unique among active siblings.
- Validation and move simulation do not mutate caller input.
- Failures use `MatterWorktreeStructureError` with stable machine-readable codes.

## Architecture review

- `worktree-structure.js` is a focused 79 pure LOC module.
- Depth is computed from parent relationships and is never persisted.
- No repository write, task completion state, logging, or new dependency was introduced.
