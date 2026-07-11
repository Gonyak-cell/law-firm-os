# WT-01-07 acceptance

Status: implementation, targeted tests, Matter regression, manual library QA, and evidence complete; isolated commit pending because the current sandbox cannot write `.git/index.lock`.

## Accepted implementation

- Only an approved template with model-level approval evidence can be applied.
- Application creates one active Worktree with pinned `template_id` and `template_version`.
- Active template branch/task nodes are copied to independent Worktree nodes.
- Each template task node creates one `MatterTask` in `todo`; the Worktree node links that task as the sole completion source.
- Source template-node provenance is retained without retaining a live mutable reference.
- Later template version/title changes do not alter the applied Worktree snapshot.
- Draft and cross-tenant template application fail before any Worktree or Task write.
- Application is one repository transaction.

## Approval boundary

Only synthetic `[QA]` approval evidence was used in tests and manual QA. No real legal template was approved, persisted, or applied, and the named-owner Gate 0 dependency remains open.

## Architecture review

- `worktree-template-snapshot.js` is 85 pure LOC and owns only template-to-Worktree snapshot application.
- No duplicate task completion field, runtime API route, or release claim was added.
