# WT-02-01 acceptance

- Result: PASS (handler, tests, manual API-driver QA)
- `GET /api/matters/:matter_id/worktree` returns virtual root, active nodes, unclassified tasks, and computed progress.
- Repository queries are tenant- and Matter-scoped; only nodes belonging to the active Worktree are projected.
- An explicit permission grant, matching principal tenant, permission envelope, and active Matter membership are all required.
- Non-members and cross-tenant requests receive count-safe 404 responses with no item or total.
- Required isolated Git commit is pending because this sandbox cannot write `.git/index.lock`.

