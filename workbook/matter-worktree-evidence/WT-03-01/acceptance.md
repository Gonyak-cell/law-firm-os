# WT-03-01 사이드바·라우트

- 상태: PASS (source/test/render). `render.png`에서 Matter 사이드바 순서와 활성 워크트리 항목을 확인했다.
- 사이드바 순서: `업무 보드 → 워크트리 → 할 일 → 일정`
- route: `matter-worktree` exactly once in the work-management group
- section registry: `MATTER_SECTIONS` includes `matter-worktree`
- active-state mechanism: existing section-based sidebar activation is reused; no parallel state was added.

## Red → green

- RED: contract test failed because `워크트리` and `matter-worktree` were absent.
- GREEN: `node --test apps/web/test/matter-worktree-ui-contract.test.mjs` passed 1/1.
- isolated commit은 43개 TUW 경계 감사 후 생성한다.
