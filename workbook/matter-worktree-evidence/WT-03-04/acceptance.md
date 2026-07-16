# WT-03-04 Matter Code 선택·URL 상태

- 상태: PASS (source/test/render).
- filters all Matter records by canonical practice-area classification.
- supports code/title/client search.
- persists `worktree_area` and `worktree_matter` in the URL.
- restores selection on reload and browser `popstate` navigation.

## Red → green

- RED: Matter Code selection, query keys, and history restoration were absent.
- GREEN: UI contract suite passed; web typecheck passed.
- 키보드로 분야 전환 후 Matter Code를 선택했으며 URL의 `worktree_area`·`worktree_matter` 복원을 확인했다.
