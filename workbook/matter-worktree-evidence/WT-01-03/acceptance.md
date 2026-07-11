# WT-01-03 acceptance

Status: implementation, targeted tests, Matter regression, library manual QA, and evidence complete; isolated commit pending because the current sandbox cannot write `.git/index.lock`.

## Accepted implementation

- `MatterWorktreeTemplate` and `MatterWorktreeTemplateNode` are registered immutable Matter Core models.
- Template status is limited to `draft`, `approved`, or `archived`; version is a positive integer.
- An approved template requires non-empty `approval_ref`, `approved_by`, and `approved_at`.
- Template nodes allow only branch/task node types and never persist a root node.
- Nullable approval and parent keys must still be present, preventing shape drift.
- No actual legal template was approved, persisted, or applied. The manual QA record stayed `draft`, and an evidence-free approval attempt was rejected.

## Architecture review

- `worktree-template-model.js` owns template record construction and is 44 pure LOC.
- Shared Worktree base record construction has two real callers and remains in `worktree-model.js`.
- No completion state, runtime write, logger, dependency, or broad compatibility shim was added.
