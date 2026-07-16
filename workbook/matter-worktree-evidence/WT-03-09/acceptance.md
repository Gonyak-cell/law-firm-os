# WT-03-09 캔버스 도구

- 상태: PASS (source/test/build/render).
- tools: 전체 펼치기, 전체 접기, 트리 검색, 화면 맞춤.
- Enter on search expands ancestors, scrolls to the first match, and moves focus.
- fit resets only the internal canvas scroll; page overflow is not introduced.
- 대형 트리는 높이가 제한된 캔버스 내부에서만 스크롤하며 선택 노드를 자동 가시화한다.
