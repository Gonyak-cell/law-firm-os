# WT-00-01 수용 결과

상태: 구현·테스트 완료 / 커밋 대기

## 수용 기준

- 모델 계약: `MatterWorktree`, `MatterWorktreeNode` 확정
- 상태 계약: worktree와 node의 `active`, `archived` 확정
- 루트: 저장하지 않고 `MatterWorktree + Matter`에서 투영
- 삭제: 노드 배치만 보관 처리하고 `MatterTask`는 유지
- 최대 깊이: 4
- 활성 규칙: tenant·Matter당 활성 워크트리 1개
- 완료 원본: `MatterTask.status` 단일 원본
- 진행률과 depth: 저장하지 않음
- 미분류 업무: 조회 시 생성되는 가상 가지

## 결과

- 계약 fixture의 필수 필드와 모델 구성이 검증됐다.
- 저장 node type은 `branch`, `task`로 제한되고 root node는 fixture에 존재하지 않는다.
- 삭제 예상 결과에서 node는 `archived`, 연결 Task는 `matter_task_deleted=false`다.
- `max_depth=4`, `depth_persisted=false`, `max_active_per_matter=1`이 고정됐다.
- 관련 테스트는 red 0/5에서 green 5/5로 전환됐다.
- Matter 패키지 전체 테스트는 테스트용 백업 경계를 명시한 실행에서 122/122 통과했다.

## 비고

기본 전체 패키지 테스트의 첫 실행은 `/Users/jws/lawos-backups` 쓰기가 현재 샌드박스에서 `EPERM`으로 거부되어 기존 `matter-profile-service` 테스트 1건이 실패했다. `LAWOS_LOCAL_BACKUP_ROOT`와 `LAWOS_RUNTIME_BACKUP_QUEUE_ROOT`를 `/tmp`로 지정한 동일 테스트 실행은 122/122 통과했다.

커밋은 `.git/index.lock` 생성 권한이 거부되어 아직 생성되지 않았다. 다른 미커밋 변경과 섞이지 않도록 `files.txt`의 경로만 커밋 후보로 유지한다.
