# WT-00-03 acceptance

Status: PASS. Contract, owner assignment, tests, and evidence are complete.

## Accepted contract

- All six existing Matter member roles have an explicit allow or deny for worktree read, task complete, task reopen, structure edit, template manage, and template approve.
- Every action is deny-by-default and requires an active same-tenant, same-Matter membership plus a permission envelope.
- Task completion and reopen are limited to an assignee or active Matter team member whose role has an explicit grant.
- `todo` and `in_progress` can complete to `done`; `blocked` and `cancelled` cannot complete.
- Only `done` can reopen to `in_progress`, and reopen requires a reason.
- Template drafts can only become approved through the owner gate. No role receives blanket `template:approve`; the named approver identity and a separate approval reference are both required.
- Generic `matter:write` does not implicitly grant Worktree template management or approval.
- Unauthorized reads disclose neither resource existence nor counts.

## Gate 0 owner assignment

- 송무·기업 자문·분쟁·트랜잭션 분야 책임자: `jwsuh@amic.kr`
- Worktree 권한 규칙 책임자: `jwsuh@amic.kr`
- 법률업무 템플릿 승인자: `jwsuh@amic.kr`
- 실제 템플릿 `draft → approved` 전환: 별도 `approval_ref` 필요; 이 책임자 지정만으로 수행하지 않음.
