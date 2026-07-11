# WT-00-03 acceptance

Status: implementation, contract test, package regression, and evidence complete; isolated commit pending because the current sandbox cannot write `.git/index.lock`.

## Accepted contract

- All six existing Matter member roles have an explicit allow or deny for worktree read, task complete, task reopen, structure edit, template manage, and template approve.
- Every action is deny-by-default and requires an active same-tenant, same-Matter membership plus a permission envelope.
- Task completion and reopen are limited to an assignee or active Matter team member whose role has an explicit grant.
- `todo` and `in_progress` can complete to `done`; `blocked` and `cancelled` cannot complete.
- Only `done` can reopen to `in_progress`, and reopen requires a reason.
- Template drafts can only become approved through the owner gate. No role receives `template:approve` until a named approver and approval reference are recorded.
- Generic `matter:write` does not implicitly grant Worktree template management or approval.
- Unauthorized reads disclose neither resource existence nor counts.

## Open Gate 0 dependency

G0 remains open. A named template approver and the practice-area owners have not been recorded, so approved-template application remains blocked.
