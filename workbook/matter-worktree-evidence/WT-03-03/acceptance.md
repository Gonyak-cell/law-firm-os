# WT-03-03 분야 선택 컴포넌트

- 상태: PASS (source/test/render).
- exact fields: 송무, 기업 자문, 분쟁, 트랜잭션
- equal-width contract: `repeat(4, minmax(0, 1fr))`
- label length cannot change track width.
- record typography remains regular 400.

## Red → green

- RED: Worktree component and equal-width selector were absent.
- GREEN: UI contract suite passed; web typecheck passed.
- 실제 computed width: 1280px `244px`, 1024px `188.3px`, 768px `521px`, 375px `309px`; 각 viewport 내 네 버튼 편차 0px.
