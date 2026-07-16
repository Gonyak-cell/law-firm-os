# WT-04-07 최신 패키지 검증

- 상태: PASS for exact latest internal package QA.
- exact bundle: `apps/desktop/dist/mac/matter.app`, version `0.1.15`.
- exact executable SHA-256: `c0bf182389ea930585e3b0bf5c4f16529461e02bf3be751cb364d0e25f2257e0`.
- exact app content SHA-256: `bd818026084ff2d29b20c1e2b9814628c28f7942b2fbe22b13b14991141b5134`.
- exact renderer SHA-256: `80653afa942ecde437263d4febf09b03371ed2c2e9002dafe70cbfaf75151cce`.
- exact ZIP/DMG SHA-256: `30163d71af60727ab919c04ea33c75c135e4439d9f45b97c586302663509340f` / `cc481fb55fefbceb86de4c6bbf0a274841f79a7476d7764eeb2d5637f5ca5576`.
- exact packaged renderer path assertion: PASS.
- isolated packaged local API assertion: PASS; both launches used loopback endpoints and the restart changed the port.
- live flow: login → Matter → 업무 관리 → 워크트리 → seeded Matter Code → Task 체크 → 앱 종료 → 동일 앱 재실행 → 재로그인 → 동일 Matter Code.
- restored UI: checkbox checked, `1/1 완료`, horizontal page overflow absent in the captured 1440×960 screen.
- durable state: `MatterTask.status=done`; duplicated completion field 없음; audit event 1건.
- visual evidence: `packaged-before-restart.png` is a Worktree-only element capture; the two-launch receipt separately proves restart restoration.
- receipt: `packaged-restart-receipt.json` contains no credential material, employee PII, or real client data.
- package channel: internal QA only. public release: false. AWS deployment: false. production go-live: false.
