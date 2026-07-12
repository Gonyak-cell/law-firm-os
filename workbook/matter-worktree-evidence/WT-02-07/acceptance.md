# WT-02-07 acceptance

- Result: PASS (handler, tests, manual API-driver QA)
- Worktree GET returns a quoted ETag in both the handler headers and safe response body.
- Node PATCH/move and subtree archive require the caller's expected Worktree version.
- Stale writes return 409 with the current version and roll back node changes, audit, and idempotency state.
- Successful structural writes return the incremented version and ETag.
- The HTTP server forwards handler ETag headers without changing other response headers.
- Canonical evidence commit: `e4411abdb`; the historical `.git/index.lock` wait is resolved.
