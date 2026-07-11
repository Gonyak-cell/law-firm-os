# WT-03-10 반응형 아웃라인

- 상태: PASS (source/test/build/render).
- desktop uses horizontal tree inside an isolated scroll canvas.
- `max-width: 1024px` changes the workspace and branches to a vertical outline.
- `max-width: 768px` stacks selectors, progress, and tools.
- page shell and Worktree containers have bounded width/overflow; only the tree canvas may scroll.
- 375/768/1024/1280px 실제 Chromium에서 페이지 overflow 0px를 확인했다.
- 375px에서 Task 상태를 제목 아래 행으로 내려 CJK 제목이 글자 단위로 세로 분해되지 않도록 보완했다.
