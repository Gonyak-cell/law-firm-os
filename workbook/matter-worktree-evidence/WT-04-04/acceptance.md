# WT-04-04 반응형·접근성 QA

- 상태: PASS.
- 실제 Chromium viewport 375/768/1024/1280px 모두 page width와 viewport width가 같아 가로 overflow 0px였다.
- 모든 viewport에서 네 분야 버튼의 computed width 편차가 0px였다.
- 375px Task 제목 CJK 가독성 결함을 발견해 상태를 다음 행으로 이동하고 중첩 여백을 줄인 뒤 재검증했다.
- tree/treeitem/group, roving focus, Arrow Up/Down/Left/Right, Space, 키보드 분야·Matter 선택 시나리오 8/8이 통과했다.
- 증거: `render-375.png`, `render-768.png`, `render-1024.png`, `render-1280.png`, `browser-receipt.json`.
