# WT-01-09 acceptance

Status: implementation, targeted tests, Matter regression, manual library QA, and evidence complete. Canonical evidence commit: `72cfab267`; the historical `.git/index.lock` wait is resolved.

## Accepted implementation

- `todo` and `in_progress` may complete to `done` directly in `MatterTask.status`.
- `blocked → done` and all cancelled completion attempts remain invalid.
- `done → in_progress` is the only reopen path and requires a non-empty reason.
- `blocked → in_progress` is the unblock path and requires a non-empty reason.
- Every successful transition persists through the existing repository and appends the existing audit shape when an audit sink is supplied.
- No `completed`, `checked`, or other duplicate completion field is introduced.
- G4 descriptors and runtime service now consume one shared transition table.

## Architecture review

- `task-service.js` remains 42 pure LOC.
- Specialized complete/reopen/unblock entry points delegate to the existing transition write and audit boundary.
- The previous G4 test was updated to assert the intentional new `todo → done` rule; no test was deleted or weakened.
