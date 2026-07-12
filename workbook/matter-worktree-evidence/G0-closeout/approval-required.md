# G0 지정 책임자 승인 대기 (해소됨)

기술 계약과 synthetic fixture 검증은 완료됐지만 다음 세 책임자 지정은 제품·법률 결정이므로 추정하지 않는다.

| 결정 | 현재 상태 | 필요한 기록 |
|---|---|---|
| 송무·기업 자문·분쟁·트랜잭션 분야 책임자 | 지정 완료 | `jwsuh@amic.kr` |
| Worktree 권한 규칙 책임자 | 지정 완료 | `jwsuh@amic.kr` |
| 법률업무 템플릿 승인자 | 지정 완료 | `jwsuh@amic.kr` |

지정 후에도 유지되는 강제 상태:

- 실제 법률업무 템플릿은 승인자가 별도 `approval_ref`를 남기기 전까지 `draft` 유지
- 역할 전체에 `template:approve` 권한을 부여하지 않음
- synthetic `[QA]` 템플릿만 테스트에서 사용
- 구현 및 내부 패키지 QA와 공개 릴리스·AWS 배포 주장을 분리

G0 closeout: **CLOSED — OWNERS RECORDED**.
