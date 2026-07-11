# WT-04-07 최신 패키지 검증

- 상태: PASS for exact latest internal package QA.
- exact bundle: `apps/desktop/dist/mac/matter.app`, version `0.1.15`.
- exact executable SHA-256: `c0bf182389ea930585e3b0bf5c4f16529461e02bf3be751cb364d0e25f2257e0`.
- exact packaged renderer path assertion: PASS.
- isolated packaged local API assertion: PASS; both launches used loopback endpoints and the restart changed the port.
- live flow: login → Matter → 업무 관리 → 워크트리 → seeded Matter Code → Task 체크 → 앱 종료 → 동일 앱 재실행 → 재로그인 → 동일 Matter Code.
- restored UI: checkbox checked, `1/1 완료`, horizontal page overflow absent in the captured 1440×960 screen.
- durable state: `MatterTask.status=done`; duplicated completion field 없음; audit event 1건.
- visual evidence: `packaged-before-restart.png`, `packaged-after-restart.png`.
- receipt: `packaged-restart-receipt.json` contains no credential material or real client data.
- package channel: internal QA only. public release: false. AWS deployment: false. production go-live: false.
