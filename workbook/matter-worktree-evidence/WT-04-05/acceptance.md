# WT-04-05 성능

- 상태: PASS for deterministic preparation and actual Chromium stable render.
- dataset: 300 Worktree nodes, 10 branch groups, 50 iterations.
- p50: 0.18 ms.
- p95: 0.50 ms.
- max: 0.93 ms.
- budget: 1,500 ms.
- no long synchronous model-preparation task observed.
- 실제 Chromium 300 persisted nodes + projected root 301 treeitems 안정 렌더: 71.60ms.
- page overflow: 0px; 50ms 이상 long task: 0건; 제한된 내부 canvas가 선택 루트를 자동 가시화했다.
- 증거: `render.png`, `browser-receipt.json`, `../WT-04-03/current-browser-receipt.json`.
