# WT-03-06 Task 체크·재개

- 상태: PASS (source/test/build/render).
- unchecked Task invokes complete once.
- completed Task opens a confirmation dialog instead of reopening immediately.
- cancel performs no mutation; confirm stays disabled until a reopen reason exists.
- confirmed reopen invokes the dedicated endpoint once and then refetches MatterTask truth.
- 실제 브라우저에서 취소 시 API 0회, 확인 시 1회, Space 키 재개 시 추가 1회를 확인했다.
