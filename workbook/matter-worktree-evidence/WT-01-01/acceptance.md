# WT-01-01 acceptance

Status: implementation, targeted tests, Matter regression, web build, and evidence complete. Canonical evidence commit: `0f4427a03`; the historical `.git/index.lock` wait is resolved.

## Accepted implementation

- One browser-safe Matter package function now classifies litigation, corporate advisory, dispute, transaction, and unclassified Matters.
- The field order remains `matter_type_english`, `matter_axis`, `matter_profile_kind`, then `profile_kind`.
- Alias normalization is case-insensitive and treats whitespace, hyphens, and underscores equivalently.
- Existing Matter board category IDs remain unchanged.
- `MattersSurface` delegates to the shared function and no longer carries a second classification implementation.
- The package public index exports the classifier.

## Environment note

The full web UI suite reached 66 passes, 18 failures, and 1 skip in this sandbox. The failures were caused by `listen EPERM: operation not permitted 127.0.0.1` in browser-server tests. The new static board integration test passed independently and the production web build passed.

AI slop review: this TUW changes no visible copy or styling. The changed-worktree scan reported 49 weak findings in the pre-existing dirty `apps/web/src/styles.css`; none are introduced or touched by WT-01-01.
