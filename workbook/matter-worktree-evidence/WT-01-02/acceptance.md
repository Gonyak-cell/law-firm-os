# WT-01-02 acceptance

Status: implementation, targeted tests, Matter regression, library manual QA, and evidence complete. Canonical evidence commit: `c148ef139`; the historical `.git/index.lock` wait is resolved.

## Accepted implementation

- `MatterWorktree` and `MatterWorktreeNode` are registered Matter Core model types.
- Both factories produce immutable records and are available through `createMatterCoreRecord` and the package index.
- Required fields reject missing keys while explicitly nullable `parent_node_id` and `task_id` accept null.
- Only `branch` and `task` node types are accepted; persisted `root` nodes are rejected.
- Branch nodes require null `task_id`; task nodes require a non-empty `task_id`.
- Worktree versions must be positive integers.
- No completion state is added outside `MatterTask.status`.

## Architecture review

- `worktree-model.js` owns only Worktree record construction and is 71 pure LOC.
- Existing `model.js` and `registry.js` exceed 250 pure LOC; the new factories remain in the focused file, while the registry receives only data-table entries and the generic factory receives only routing lines. No broad unrelated split was performed.
- Input validation remains at model construction boundaries. No logging, escape hatches, parameter bloat, destructive verification, or new dependencies were introduced.
