# Matter Worktree v1 final goal audit

Audit date: 2026-07-12

| Goal condition | Verdict | Current evidence |
|---|---|---|
| 43 TUWs implemented and evidenced | PASS | 43 IDs, 43 canonical subject commits, 43 evidence directories; canonical validator PASS |
| One isolated implementation/test/evidence commit per TUW | FAIL | Retrospective review found cross-TUW implementation leakage in `aa23d8d9c` and `ab25741d5`; later canonical commits for affected TUWs are evidence-heavy |
| G0 named owners | PASS | all practice areas, permission rules, and legal-template approval: `jwsuh@amic.kr` |
| Specific template approval remains separate | PASS | runtime requires matching approver plus non-empty `approval_ref`; no real template approved or applied |
| MatterTask is sole completion source | PASS | persistence, API, browser, and restart assertions |
| Tenant/Matter/role isolation | PASS | focused security tests and count-safe 404 behavior |
| Audit, idempotency, optimistic version | PASS | one durable audit event, replay safety, stale-write 409 |
| 8 fixture Matters | PASS | omissions 0; misclassifications 0 |
| Browser responsiveness and keyboard | PASS | 375/768/1024/1280px overflow 0; six axes visible; keyboard 8/8 |
| Virtual branch, focus, fit view | PASS | dashed `미분류 업무`, visible focus ring, 634/634px fit containment |
| 300-node performance | PASS | 301 rendered treeitems in 63.17ms; long tasks 0 |
| Exact latest matter.app restart | PASS | two launches; fresh port; `todo → done → done`; restored `1/1`; app-content/renderer/ZIP/DMG hashes recorded |
| Current-tree evidence privacy | PASS | isolated synthetic store, Worktree-only screenshot, no credential material, employee PII, or real client data in `HEAD` |
| Intended push history privacy | FAIL | deleted employee PII screenshots remain reachable from unpublished branch commits; normal push is prohibited |
| Claim boundaries | PASS | internal app/ZIP/DMG only; public release false; AWS deployment false; production go-live false |

## Review-found defects remediated

- UI node create now sends `status` and nullable `task_id`.
- New siblings use `max(sort_order) + 1`, so archive-created gaps cannot cause ordering conflicts.
- Parent archive ignores already archived descendants and succeeds bottom-up.
- `task:unblock` is exhaustive in the permission contract and fixture.
- Approved templates reject any `approved_by` other than `jwsuh@amic.kr` at model and snapshot boundaries.
- The template picker also hides legacy approved records with a mismatched approver.
- Mobile/tablet product axes, virtual branch distinction, search focus, and fit-view behavior are rendered and asserted.
- Package evidence pins app content, renderer, ZIP, and DMG instead of relying only on the Electron executable hash.

## Completion decision

The product behavior, runtime security boundary, browser QA, and exact internal package QA are complete. The goal cannot be marked 100% complete under its original wording because historical commit isolation is immutable without a history rewrite. The branch also cannot be pushed normally because deleted employee PII screenshots remain reachable from prior commits. Rewriting or reconstructing the branch would be destructive and was not performed. The goal can close only after both:

1. explicit authorization to create a clean sanitized release history, and
2. either authorization to reconstruct the TUW commits or explicit acceptance that the 43 canonical evidence commits plus separate remediation commits satisfy the execution-history requirement.
