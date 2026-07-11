# WT-04-06 Electron IPC·재시작

- 상태: PASS.
- RED: initial restart test used mismatched/malformed permission evidence and was rejected with `MATTER_API_VALIDATION_ERROR` before mutation.
- GREEN: completed Task persisted across repository close/reopen; reasoned reopen persisted across a second close/reopen.
- progress changed 1→0 consistently with MatterTask.status.
- two audit events survived restart.
- desktop main-process allowlist tests passed for every Worktree route shape.
- verification: 20/20 restart+desktop runtime tests passed.
- exact packaged app verification: isolated local runtime store에서 앱 첫 실행으로 Task를 완료하고 프로세스를 완전히 종료한 뒤 같은 `matter.app`을 재실행했다.
- second launch used a fresh local API port and restored `MatterTask.status=done`, checked UI, `1/1 완료`, audit event 1건을 확인했다.
- evidence: `packaged-restart-receipt.json`, `packaged-before-restart.png`, `packaged-after-restart.png`.
- isolated commit boundary remains pending global 43-commit reconstruction.
