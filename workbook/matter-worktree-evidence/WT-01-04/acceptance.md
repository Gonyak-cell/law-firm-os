# WT-01-04 acceptance

Status: implementation, targeted tests, Matter regression, SQL syntax QA, restart QA, and evidence complete. Canonical evidence commit: `90bc855be`; the historical `.git/index.lock` wait is resolved.

## Accepted implementation

- The file repository resolves canonical IDs for all four Worktree model types.
- Worktree, node, draft template, and template node records survive repository close and reopen unchanged.
- Migration `002_matter_worktree` defines durable Worktree and template tables.
- Opening a legacy `001` store merges and durably writes the `002` manifest while retaining existing records.
- The SQL migration executes successfully in an in-memory SQLite syntax check.
- Repository record identity and normalization were extracted to an internal module; package public API and file shape remain unchanged.

## Refactor and architecture review

- `repository.js` is 223 pure LOC after extraction, below the 250-line limit.
- `repository-record.js` is 46 pure LOC and owns only repository record identity and boundary normalization.
- The helper is internal and is not exported from the package index.
- Registry-derived IDs were not adopted because that would newly normalize Wiki/Graph types and change existing repository behavior.
- Five read-only reviewers mapped usages, tests, patterns, architecture, and a rollback plan. The narrower identity extraction preserved semantics and passed all targeted and package tests.
