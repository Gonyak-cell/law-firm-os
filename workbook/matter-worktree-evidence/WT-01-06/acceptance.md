# WT-01-06 acceptance

Status: implementation, targeted tests, Matter regression, manual library QA, and evidence complete; isolated commit pending because the current sandbox cannot write `.git/index.lock`.

## Accepted implementation

- Only one active MatterWorktree may exist per `tenant_id + matter_id`.
- Archived Worktrees remain alongside the current active Worktree.
- The service rejects a second active Worktree with `WORKTREE_ACTIVE_CONFLICT`.
- The repository repeats the uniqueness check at its write boundary to cover direct/racing callers.
- A matching `expected_version` increments version exactly once.
- A stale expected version fails with `WORKTREE_VERSION_CONFLICT`, reports `current_version`, and does not change storage.
- Active uniqueness is tenant-scoped.

## Architecture review

- `worktree-concurrency.js` is 48 pure LOC and owns only active uniqueness and optimistic version commands.
- `repository.js` remains below the size gate at 236 pure LOC.
- No task status, progress state, retry loop, or runtime lock was introduced.
