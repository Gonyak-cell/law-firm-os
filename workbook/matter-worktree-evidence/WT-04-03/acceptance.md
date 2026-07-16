# WT-04-03 브라우저 UI E2E

- 상태: PASS.
- 실제 Chromium에서 분야 전환, Matter 선택, 완료 해제 취소·확정, 검색 포커스, 접기·펼치기를 실행했다.
- 취소 시 reopen API 0회, 마우스 확인 후 1회, Space 키 확인 후 총 2회였다.
- denied·network error·409 conflict 복구 상태도 각각 실제 렌더했다.
- 증거: `render.png`, `reopen-dialog.png`, `search-focus.png`, `browser-receipt.json`.
